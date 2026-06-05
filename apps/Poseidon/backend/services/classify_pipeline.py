"""
Classification Pipeline

Orchestrates:
  1. Frame extraction
  2. All 4 agents running concurrently with per-agent debug callbacks
  3. Fusion & decision engine
  4. DB write-back
  5. WebSocket progress updates with detailed agent-level events
"""

import asyncio
from datetime import datetime
from pathlib import Path
from typing import Any, Callable, Dict, List, Optional

import numpy as np
from loguru import logger
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from agents.base_agent import AgentResult, BaseAgent
from agents.face_agent     import FaceAgent
from agents.pose_agent     import PoseAgent
from agents.board_agent    import BoardAgent
from agents.clothing_agent import ClothingAgent
from fusion.decision_engine import decision_engine
from models import ClassificationStatus, ProcessingJob, Surfist, Video
from services.video_processor import video_processor
from config import settings


_face_agent     = FaceAgent()
_pose_agent     = PoseAgent()
_board_agent    = BoardAgent()
_clothing_agent = ClothingAgent()

AGENT_PCT_START = 30
AGENT_PCT_END = 70


async def _run_agent_with_debug(
    agent: BaseAgent,
    video_path: str,
    frames: List[Any],
    surfist_profiles: Dict[str, Any],
    agent_idx: int,
    total_agents: int,
    video_id: str,
    debug_cb: Optional[Callable] = None,
) -> AgentResult:
    pct_per_agent = (AGENT_PCT_END - AGENT_PCT_START) / total_agents
    base_pct = AGENT_PCT_START + agent_idx * pct_per_agent

    if debug_cb:
        await debug_cb({
            "type": "agent_status",
            "video_id": video_id,
            "agent": agent.name,
            "phase": "initializing",
            "pct": round(base_pct, 1),
            "detail": f"Carregando modelo do {agent.name}...",
        })

    if not agent._initialized and not agent._init_error:
        try:
            await agent.initialize()
            agent._initialized = True
        except Exception as e:
            agent._init_error = str(e)

    if debug_cb:
        await debug_cb({
            "type": "agent_status",
            "video_id": video_id,
            "agent": agent.name,
            "phase": "extracting",
            "pct": round(base_pct + pct_per_agent * 0.3, 1),
            "detail": f"Extraindo features de {len(frames)} frames...",
        })

    embedding = await agent.extract_features(video_path, frames)

    has_signal = embedding is not None
    signal_info = {
        "embedding_dim": len(embedding) if embedding is not None else 0,
        "has_signal": has_signal,
    }

    if debug_cb:
        await debug_cb({
            "type": "agent_status",
            "video_id": video_id,
            "agent": agent.name,
            "phase": "extracted",
            "pct": round(base_pct + pct_per_agent * 0.6, 1),
            "detail": (
                f"Features extraídas: {signal_info['embedding_dim']} dimensões"
                if has_signal
                else "Nenhum sinal detectado neste vídeo"
            ),
            "signal": signal_info,
        })

    if embedding is None:
        result = AgentResult(
            agent_name=agent.name,
            surfist_id=None,
            confidence=0.0,
            error="No usable signal extracted from video",
        )
        if debug_cb:
            await debug_cb({
                "type": "agent_result",
                "video_id": video_id,
                "agent": agent.name,
                "phase": "done",
                "pct": round(base_pct + pct_per_agent, 1),
                "result": result.to_dict(),
                "match_detail": "Sem sinal para comparar",
            })
        return result

    if debug_cb:
        await debug_cb({
            "type": "agent_status",
            "video_id": video_id,
            "agent": agent.name,
            "phase": "matching",
            "pct": round(base_pct + pct_per_agent * 0.7, 1),
            "detail": f"Comparando contra {len(surfist_profiles)} perfis...",
        })

    result = await agent.match_database(embedding, surfist_profiles)

    match_detail = ""
    if result.surfist_id:
        match_detail = f"Match: surfist {result.surfist_id[:8]}... ({result.confidence:.1%})"
    elif result.error:
        match_detail = f"Erro: {result.error}"
    else:
        match_detail = "Nenhum perfil acima do limiar de similaridade"

    per_surfist_sim = result.features.get("per_surfist_similarity", {})
    all_sims = {}
    embedding_key_map = {
        "FaceAgent": "face_embeddings",
        "PoseAgent": "pose_embeddings",
        "BoardAgent": "board_features",
        "ClothingAgent": "clothing_embeddings",
    }
    emb_key = embedding_key_map.get(agent.name, "")
    for sid, profile in surfist_profiles.items():
        embs = profile.get(emb_key, [])
        if embs and embedding is not None:
            sims = [BaseAgent.cosine_similarity(embedding, np.array(e)) for e in embs]
            all_sims[sid] = {
                "name": profile.get("name", sid[:8]),
                "best_sim": round(max(sims), 4),
                "avg_sim": round(sum(sims) / len(sims), 4),
                "num_refs": len(embs),
            }

    if debug_cb:
        await debug_cb({
            "type": "agent_result",
            "video_id": video_id,
            "agent": agent.name,
            "phase": "done",
            "pct": round(base_pct + pct_per_agent, 1),
            "result": result.to_dict(),
            "match_detail": match_detail,
            "all_similarities": all_sims,
            "threshold": _get_agent_threshold(agent.name),
        })

    return result


def _get_agent_threshold(agent_name: str) -> float:
    thresholds = {
        "FaceAgent": settings.FACE_SIM_THRESHOLD,
        "PoseAgent": settings.POSE_SIM_THRESHOLD,
        "BoardAgent": settings.BOARD_SIM_THRESHOLD,
        "ClothingAgent": settings.CLOTHING_SIM_THRESHOLD,
    }
    return thresholds.get(agent_name, 0.60)


class ClassificationPipeline:

    async def run(
        self,
        video: Video,
        db: AsyncSession,
        progress_cb: Optional[Callable[[float, str], Any]] = None,
        debug_cb: Optional[Callable] = None,
    ) -> None:
        job = ProcessingJob(video_id=video.id, started_at=datetime.utcnow())
        db.add(job)
        await db.commit()

        async def _progress(pct: float, msg: str):
            job.progress     = pct
            job.current_step = msg
            await db.commit()
            if progress_cb:
                await progress_cb(pct, msg)

        try:
            # ── Step 1: Extract frames ─────────────────────────────────────
            await _progress(5, "Extraindo frames do vídeo...")
            if debug_cb:
                await debug_cb({
                    "type": "pipeline_status",
                    "video_id": video.id,
                    "phase": "frame_extraction",
                    "pct": 5,
                    "detail": "Extraindo frames do vídeo...",
                })

            frames = await video_processor.extract_frames(video.file_path)
            if not frames:
                raise RuntimeError("No frames could be extracted from video")

            await _progress(15, f"{len(frames)} frames extraídos")
            if debug_cb:
                await debug_cb({
                    "type": "pipeline_status",
                    "video_id": video.id,
                    "phase": "frames_extracted",
                    "pct": 15,
                    "detail": f"{len(frames)} frames extraídos do vídeo",
                    "frame_count": len(frames),
                })

            # ── Step 2: Load surfist profiles ─────────────────────────────
            await _progress(20, "Carregando perfis de surfistas...")
            if debug_cb:
                await debug_cb({
                    "type": "pipeline_status",
                    "video_id": video.id,
                    "phase": "loading_profiles",
                    "pct": 20,
                    "detail": "Carregando perfis de surfistas...",
                })

            surfist_profiles = await self._load_surfist_profiles(db)

            profile_info = [
                {
                    "id": sid[:8] + "...",
                    "name": p.get("name", "?"),
                    "face_refs": len(p.get("face_embeddings", [])),
                    "pose_refs": len(p.get("pose_embeddings", [])),
                    "board_refs": len(p.get("board_features", [])),
                    "clothing_refs": len(p.get("clothing_embeddings", [])),
                }
                for sid, p in surfist_profiles.items()
            ]

            await _progress(25, f"{len(surfist_profiles)} perfis carregados")
            if debug_cb:
                await debug_cb({
                    "type": "pipeline_status",
                    "video_id": video.id,
                    "phase": "profiles_loaded",
                    "pct": 25,
                    "detail": f"{len(surfist_profiles)} perfis carregados",
                    "profiles": profile_info,
                })

            # ── Step 3: Run all 4 agents with debug ─────────────────────
            agents = [_face_agent, _pose_agent, _board_agent, _clothing_agent]

            if debug_cb:
                await debug_cb({
                    "type": "pipeline_status",
                    "video_id": video.id,
                    "phase": "agents_starting",
                    "pct": AGENT_PCT_START,
                    "detail": "Iniciando 4 agentes de IA em paralelo...",
                    "agents": [a.name for a in agents],
                })

            tasks = [
                _run_agent_with_debug(
                    agent=agent,
                    video_path=video.file_path,
                    frames=frames,
                    surfist_profiles=surfist_profiles,
                    agent_idx=i,
                    total_agents=len(agents),
                    video_id=video.id,
                    debug_cb=debug_cb,
                )
                for i, agent in enumerate(agents)
            ]

            results = await asyncio.gather(*tasks, return_exceptions=True)

            agent_results = []
            for r in results:
                if isinstance(r, Exception):
                    agent_results.append(AgentResult(
                        agent_name="Unknown", surfist_id=None,
                        confidence=0.0, error=str(r),
                    ))
                else:
                    agent_results.append(r)

            face_r, pose_r, board_r, clothing_r = agent_results

            await _progress(75, "Agentes completos — fundindo resultados...")
            if debug_cb:
                await debug_cb({
                    "type": "pipeline_status",
                    "video_id": video.id,
                    "phase": "fusion_start",
                    "pct": 75,
                    "detail": "Fundindo resultados dos 4 agentes...",
                    "agent_summary": {
                        r.agent_name: {
                            "confidence": round(r.confidence, 4),
                            "surfist_id": r.surfist_id[:8] + "..." if r.surfist_id else None,
                            "error": r.error,
                        }
                        for r in agent_results
                    },
                })

            # ── Step 4: Fusion ─────────────────────────────────────────────
            fusion = decision_engine.fuse(agent_results)

            if debug_cb:
                await debug_cb({
                    "type": "fusion_result",
                    "video_id": video.id,
                    "pct": 80,
                    "detail": f"Decisão: {fusion.status.value} ({fusion.final_confidence:.1%})",
                    "fusion": fusion.to_dict(),
                })

            agent_details = await self._apply_auto_learning(
                video=video,
                db=db,
                frames=frames,
                agent_results=agent_results,
                surfist_profiles=surfist_profiles,
                fusion=fusion,
            )

            if debug_cb:
                auto_action = agent_details.get("auto_created_surfist")
                if auto_action:
                    detail_msg = f"Novo surfista criado: {auto_action['name']}"
                else:
                    detail_msg = agent_details.get("reason", "Processamento concluído")
                await debug_cb({
                    "type": "pipeline_status",
                    "video_id": video.id,
                    "phase": "auto_learning",
                    "pct": 85,
                    "detail": detail_msg,
                    "final_status": fusion.status.value,
                    "final_confidence": round(fusion.final_confidence, 4),
                })

            await _progress(85, f"Decision: {fusion.status.value} ({fusion.final_confidence:.1%})")

            # ── Step 5: Write results to DB ────────────────────────────────
            video.face_confidence     = face_r.confidence
            video.pose_confidence     = pose_r.confidence
            video.board_confidence    = board_r.confidence
            video.clothing_confidence = clothing_r.confidence
            video.final_confidence    = fusion.final_confidence

            video.face_surfist_id     = face_r.surfist_id
            video.pose_surfist_id     = pose_r.surfist_id
            video.board_surfist_id    = board_r.surfist_id
            video.clothing_surfist_id = clothing_r.surfist_id

            video.surfist_id  = fusion.surfist_id
            video.status      = fusion.status
            video.agent_details = agent_details
            video.processed_at  = datetime.utcnow()

            vid_stem = Path(video.file_path).stem
            features_path = Path(settings.FEATURES_PATH)

            face_crop  = features_path / f"{vid_stem}_face.jpg"
            pose_sketch = features_path / f"{vid_stem}_pose.jpg"
            board_crop  = features_path / f"{vid_stem}_board.jpg"

            video.face_crop_path   = str(face_crop)  if face_crop.exists()  else None
            video.pose_sketch_path = str(pose_sketch) if pose_sketch.exists() else None
            video.board_crop_path  = str(board_crop)  if board_crop.exists() else None

            job.status       = "done"
            job.progress     = 100
            job.completed_at = datetime.utcnow()
            await db.commit()

            if debug_cb:
                await debug_cb({
                    "type": "pipeline_complete",
                    "video_id": video.id,
                    "pct": 100,
                    "detail": "Classificação completa",
                    "surfist_id": fusion.surfist_id,
                    "surfist_name": agent_details.get("auto_created_surfist", {}).get("name"),
                    "status": fusion.status.value,
                    "confidence": round(fusion.final_confidence, 4),
                    "reason": agent_details.get("reason", ""),
                    "evidence_paths": {
                        "face_crop": video.face_crop_path,
                        "pose_sketch": video.pose_sketch_path,
                        "board_crop": video.board_crop_path,
                    },
                })

            await _progress(100, "Classification complete")
            logger.info(
                "[Pipeline] Video %s → %s (confidence=%.3f)",
                video.id, fusion.status.value, fusion.final_confidence,
            )

        except Exception as exc:
            logger.error("[Pipeline] Error processing video %s: %s", video.id, exc)
            if debug_cb:
                await debug_cb({
                    "type": "pipeline_error",
                    "video_id": video.id,
                    "detail": f"Erro: {str(exc)}",
                })
            video.status        = ClassificationStatus.UNCLASSIFIED
            video.error_message = str(exc)
            job.status          = "failed"
            job.error           = str(exc)
            job.completed_at    = datetime.utcnow()
            await db.commit()
            raise

    async def _apply_auto_learning(
        self,
        video: Video,
        db: AsyncSession,
        frames: List[Any],
        agent_results: List[Any],
        surfist_profiles: Dict[str, Any],
        fusion: Any,
    ) -> Dict[str, Any]:
        """Create or enrich surfist profiles from confident video evidence."""
        signal = self._signal_summary(agent_results)

        if not signal["has_person"]:
            fusion.surfist_id = None
            fusion.status = ClassificationStatus.UNCLASSIFIED
            fusion.final_confidence = 0.0
            details = fusion.to_dict()
            details["reason"] = (
                "Não classificado: nenhum agente encontrou sinal confiável de surfista "
                "no vídeo. Envie para revisão humana se o surfista estiver muito distante, "
                "oculto ou fora do enquadramento."
            )
            details["signal_summary"] = signal
            return details

        if not surfist_profiles:
            surfist = await self._create_surfist_from_video(db, video, frames, agent_results)
            fusion.surfist_id = surfist.id
            fusion.status = ClassificationStatus.AUTO_CLASSIFIED
            fusion.final_confidence = max(0.88, signal["quality_score"])
            details = fusion.to_dict()
            details["reason"] = (
                f"Primeiro perfil criado automaticamente: o vídeo tem sinal de surfista "
                f"em {', '.join(signal['person_agents'])}. Usei o frame de referência "
                f"para abrir a pasta {surfist.folder_name}."
            )
            details["auto_created_surfist"] = {
                "id": surfist.id,
                "name": surfist.name,
                "folder_name": surfist.folder_name,
            }
            details["signal_summary"] = signal
            return details

        if fusion.status == ClassificationStatus.AUTO_CLASSIFIED and fusion.surfist_id:
            await self._append_embeddings_to_surfist(db, fusion.surfist_id, video, agent_results)
            details = fusion.to_dict()
            details["reason"] = (
                f"{details.get('reason', '')} Perfil reforçado com os sinais deste vídeo."
            ).strip()
            details["signal_summary"] = signal
            return details

        if fusion.status == ClassificationStatus.UNCLASSIFIED:
            fusion.surfist_id = None
            fusion.status = ClassificationStatus.PENDING_REVIEW
            fusion.final_confidence = max(0.40, min(0.78, signal["quality_score"] - 0.12))
            details = fusion.to_dict()
            details["reason"] = (
                "Revisão humana necessária: há sinal de surfista, mas os agentes não "
                "conseguiram encaixar o vídeo em uma pasta existente. Pode ser um novo "
                "surfista, um surfista já cadastrado com ângulo difícil, ou conflito entre sinais."
            )
            details["signal_summary"] = signal
            return details

        details = fusion.to_dict()
        details["signal_summary"] = signal
        return details

    @staticmethod
    def _signal_summary(agent_results: List[Any]) -> Dict[str, Any]:
        person_agents = [
            r.agent_name for r in agent_results
            if r.agent_name in {"FaceAgent", "PoseAgent", "ClothingAgent"}
            and r.embedding is not None
        ]
        board_signal = any(
            r.agent_name == "BoardAgent" and r.embedding is not None
            for r in agent_results
        )
        quality_score = min(
            0.96,
            0.52 + (0.14 * len(person_agents)) + (0.08 if board_signal else 0.0),
        )
        return {
            "has_person": len(person_agents) > 0,
            "person_agents": person_agents,
            "board_signal": board_signal,
            "quality_score": round(quality_score, 4),
            "agent_errors": {
                r.agent_name: r.error for r in agent_results if r.error
            },
        }

    async def _create_surfist_from_video(
        self,
        db: AsyncSession,
        video: Video,
        frames: List[Any],
        agent_results: List[Any],
    ) -> Surfist:
        max_result = await db.execute(select(func.max(Surfist.display_id)))
        display_id = (max_result.scalar() or 0) + 1
        palette = [
            "#0EA5E9", "#10B981", "#F59E0B", "#F43F5E",
            "#8B5CF6", "#14B8A6", "#EAB308", "#EC4899",
        ]
        surfist = Surfist(
            name=f"Surfista {display_id}",
            display_id=display_id,
            color_hex=palette[(display_id - 1) % len(palette)],
            reference_images=[self._reference_image_for(video, frames)],
        )
        self._append_embeddings(surfist, agent_results)
        db.add(surfist)
        await db.flush()
        return surfist

    async def _append_embeddings_to_surfist(
        self,
        db: AsyncSession,
        surfist_id: str,
        video: Video,
        agent_results: List[Any],
    ) -> None:
        result = await db.execute(select(Surfist).where(Surfist.id == surfist_id))
        surfist = result.scalar_one_or_none()
        if not surfist:
            return
        self._append_embeddings(surfist, agent_results)
        refs = list(surfist.reference_images or [])
        if video.thumbnail_path and video.thumbnail_path not in refs:
            refs.append(video.thumbnail_path)
            surfist.reference_images = refs[-8:]

    @staticmethod
    def _append_embeddings(surfist: Surfist, agent_results: List[Any]) -> None:
        mapping = {
            "FaceAgent":     "face_embeddings",
            "PoseAgent":     "pose_embeddings",
            "ClothingAgent": "clothing_embeddings",
            "BoardAgent":    "board_features",
        }
        for result in agent_results:
            attr = mapping.get(result.agent_name)
            if not attr or result.embedding is None:
                continue
            values = list(getattr(surfist, attr) or [])
            values.append(result.embedding.tolist())
            setattr(surfist, attr, values[-24:])

    @staticmethod
    def _reference_image_for(video: Video, frames: List[Any]) -> str:
        if video.thumbnail_path:
            return video.thumbnail_path
        if not frames:
            return ""
        try:
            import cv2

            frame = frames[len(frames) // 2]
            out_path = Path(settings.THUMBNAILS_PATH) / f"ref_auto_{video.id}.jpg"
            cv2.imwrite(str(out_path), frame, [cv2.IMWRITE_JPEG_QUALITY, 88])
            return str(out_path)
        except Exception as exc:
            logger.warning("[Pipeline] Could not save reference frame: %s", exc)
            return ""

    # ── Helper: load profiles ──────────────────────────────────────────────────

    @staticmethod
    async def _load_surfist_profiles(db: AsyncSession) -> Dict[str, Any]:
        """Load all active surfist embeddings into a dict for agent matching."""
        result = await db.execute(
            select(Surfist).where(Surfist.is_active == True)
        )
        surfists = result.scalars().all()
        return {
            s.id: {
                "face_embeddings":     s.face_embeddings     or [],
                "pose_embeddings":     s.pose_embeddings     or [],
                "clothing_embeddings": s.clothing_embeddings or [],
                "board_features":      s.board_features      or [],
                "name":                s.name,
                "display_id":          s.display_id,
            }
            for s in surfists
        }


# ── Module-level singleton ─────────────────────────────────────────────────────
classification_pipeline = ClassificationPipeline()
