import asyncio
from datetime import datetime
from pathlib import Path
from typing import Any, Callable, Dict, List, Optional

import numpy as np
from loguru import logger
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from agents.base_agent import AgentResult, BaseAgent
from agents.face_agent import FaceAgent
from agents.pose_agent import PoseAgent
from agents.board_agent import BoardAgent
from agents.clothing_agent import ClothingAgent
from services.ai_fusion import phase1_classify, phase2_deep_compare, fallback_classify
from fusion.decision_engine import decision_engine
from models import ClassificationStatus, ProcessingJob, Surfist, Video
from services.video_processor import video_processor
from config import settings

_face_agent = FaceAgent()
_pose_agent = PoseAgent()
_board_agent = BoardAgent()
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

    if debug_cb:
        await debug_cb({
            "type": "agent_status",
            "video_id": video_id,
            "agent": agent.name,
            "phase": "extracted",
            "pct": round(base_pct + pct_per_agent * 0.5, 1),
            "detail": f"Features: {len(embedding) if has_signal else 0}d | Analisando...",
            "signal": {"embedding_dim": len(embedding) if has_signal else 0, "has_signal": has_signal},
        })

    if embedding is None:
        result = AgentResult(
            agent_name=agent.name, surfist_id=None, confidence=0.0,
            error="No usable signal extracted from video",
            description="nao detectado neste video",
        )
        if debug_cb:
            await debug_cb({
                "type": "agent_result", "video_id": video_id, "agent": agent.name,
                "phase": "done", "pct": round(base_pct + pct_per_agent, 1),
                "result": result.to_dict(), "match_detail": "Sem sinal para comparar",
            })
        return result

    if debug_cb:
        await debug_cb({
            "type": "agent_status",
            "video_id": video_id, "agent": agent.name,
            "phase": "matching",
            "pct": round(base_pct + pct_per_agent * 0.7, 1),
            "detail": f"Comparando contra {len(surfist_profiles)} perfis...",
        })

    result = await agent.match_database(embedding, surfist_profiles)

    embedding_key_map = {
        "FaceAgent": "face_embeddings", "PoseAgent": "pose_embeddings",
        "BoardAgent": "board_features", "ClothingAgent": "clothing_embeddings",
    }
    emb_key = embedding_key_map.get(agent.name, "")
    all_sims = {}
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
        match_detail = result.description or "sem descricao"
        if result.surfist_id:
            match_detail += f" | Match: {result.surfist_id[:8]}... ({result.confidence:.1%})"
        await debug_cb({
            "type": "agent_result", "video_id": video_id, "agent": agent.name,
            "phase": "done", "pct": round(base_pct + pct_per_agent, 1),
            "result": result.to_dict(), "match_detail": match_detail,
            "all_similarities": all_sims,
            "threshold": _get_agent_threshold(agent.name),
            "description": result.description,
        })

    return result


def _get_agent_threshold(agent_name: str) -> float:
    return {
        "FaceAgent": settings.FACE_SIM_THRESHOLD, "PoseAgent": settings.POSE_SIM_THRESHOLD,
        "BoardAgent": settings.BOARD_SIM_THRESHOLD, "ClothingAgent": settings.CLOTHING_SIM_THRESHOLD,
    }.get(agent_name, 0.60)


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
            job.progress = pct
            job.current_step = msg
            await db.commit()
            if progress_cb:
                await progress_cb(pct, msg)

        try:
            await _progress(5, "Extraindo frames do video...")
            if debug_cb:
                await debug_cb({"type": "pipeline_status", "video_id": video.id, "phase": "frame_extraction", "pct": 5, "detail": "Extraindo frames do video..."})

            frames = await video_processor.extract_frames(video.file_path)
            if not frames:
                raise RuntimeError("No frames could be extracted from video")

            await _progress(15, f"{len(frames)} frames extraidos")
            if debug_cb:
                await debug_cb({"type": "pipeline_status", "video_id": video.id, "phase": "frames_extracted", "pct": 15, "detail": f"{len(frames)} frames extraidos", "frame_count": len(frames)})

            await _progress(20, "Carregando perfis de surfistas...")
            surfist_profiles = await self._load_surfist_profiles(db)
            profile_info = [
                {"id": sid[:8] + "...", "name": p.get("name", "?"),
                 "face_refs": len(p.get("face_embeddings", [])), "pose_refs": len(p.get("pose_embeddings", [])),
                 "board_refs": len(p.get("board_features", [])), "clothing_refs": len(p.get("clothing_embeddings", []))}
                for sid, p in surfist_profiles.items()
            ]

            await _progress(25, f"{len(surfist_profiles)} perfis carregados")
            if debug_cb:
                await debug_cb({"type": "pipeline_status", "video_id": video.id, "phase": "profiles_loaded", "pct": 25,
                    "detail": f"{len(surfist_profiles)} perfis carregados", "profiles": profile_info})

            agents = [_face_agent, _pose_agent, _board_agent, _clothing_agent]
            if debug_cb:
                await debug_cb({"type": "pipeline_status", "video_id": video.id, "phase": "agents_starting", "pct": AGENT_PCT_START,
                    "detail": "Iniciando 4 agentes de IA...", "agents": [a.name for a in agents]})

            tasks = [
                _run_agent_with_debug(agent=agent, video_path=video.file_path, frames=frames,
                    surfist_profiles=surfist_profiles, agent_idx=i, total_agents=len(agents),
                    video_id=video.id, debug_cb=debug_cb)
                for i, agent in enumerate(agents)
            ]
            results = await asyncio.gather(*tasks, return_exceptions=True)

            agent_results = []
            for r in results:
                if isinstance(r, Exception):
                    agent_results.append(AgentResult(agent_name="Unknown", surfist_id=None, confidence=0.0, error=str(r)))
                else:
                    agent_results.append(r)

            face_r, pose_r, board_r, clothing_r = agent_results
            await _progress(75, "Agentes completos — classificando com IA...")

            video_descriptor = self._build_video_descriptor(agent_results)

            if debug_cb:
                await debug_cb({"type": "pipeline_status", "video_id": video.id, "phase": "descriptions_ready", "pct": 76,
                    "detail": "Descricoes dos agentes prontas", "video_descriptor": video_descriptor,
                    "agent_descriptions": {r.agent_name: r.description for r in agent_results}})

            folder_descriptors = await self._load_folder_descriptors(db)

            phase1_result = await phase1_classify(agent_results, folder_descriptors)

            if phase1_result is not None:
                await self._process_ai_result(
                    phase1_result, video, db, agent_results, frames,
                    surfist_profiles, folder_descriptors, video_descriptor,
                    debug_cb, _progress, job, phase=1,
                )
            else:
                await self._process_fallback(
                    video, db, agent_results, frames, surfist_profiles,
                    folder_descriptors, video_descriptor, debug_cb, _progress, job,
                )

        except Exception as exc:
            logger.error("[Pipeline] Error processing video %s: %s", video.id, exc)
            if debug_cb:
                await debug_cb({"type": "pipeline_error", "video_id": video.id, "detail": f"Erro: {str(exc)}"})
            video.status = ClassificationStatus.UNCLASSIFIED
            video.error_message = str(exc)
            job.status = "failed"
            job.error = str(exc)
            job.completed_at = datetime.utcnow()
            await db.commit()
            raise

    async def _process_ai_result(
        self, ai_result: dict, video: Video, db: AsyncSession,
        agent_results: List[AgentResult], frames: List[Any],
        surfist_profiles: Dict, folder_descriptors: Dict,
        video_descriptor: dict, debug_cb, _progress, job,
        phase: int,
    ):
        confidence = ai_result.get("confidence", 0.0)
        matched_id = ai_result.get("matched_folder_id")
        create_new = ai_result.get("create_new", False)
        reasoning = ai_result.get("reasoning", "")
        phase_label = f"Phase {phase}"

        threshold = settings.PHASE1_THRESHOLD if phase == 1 else settings.PHASE2_THRESHOLD

        if debug_cb:
            await debug_cb({
                "type": "ai_result", "video_id": video.id, "phase": phase,
                "pct": 80 if phase == 1 else 90,
                "detail": f"{phase_label}: confidence={confidence:.0%} match={matched_id[:8] if matched_id else 'none'} create_new={create_new}",
                "ai_result": ai_result, "reasoning": reasoning,
            })

        if confidence >= threshold and matched_id and not create_new:
            surfist = await self._assign_to_existing(db, matched_id, video, agent_results, video_descriptor)
            status = ClassificationStatus.AUTO_CLASSIFIED
            reason = f"IA ({phase_label}): {reasoning}"
            if debug_cb:
                await debug_cb({"type": "pipeline_status", "video_id": video.id, "phase": "ai_classified",
                    "pct": 90, "detail": f"Classificado como {surfist.name} ({confidence:.0%})",
                    "surfist_name": surfist.name, "confidence": confidence})

        elif create_new or (not matched_id and confidence < threshold):
            if phase == 1 and confidence < settings.PHASE1_THRESHOLD and folder_descriptors:
                candidates = self._get_candidates(folder_descriptors, ai_result)
                if candidates and len(candidates) > 0:
                    if debug_cb:
                        await debug_cb({"type": "pipeline_status", "video_id": video.id, "phase": "phase2_start",
                            "pct": 85, "detail": f"Confianca baixa ({confidence:.0%}) — iniciando fase 2 com {len(candidates)} candidatos"})
                    await _progress(85, f"Fase 2: comparando com {len(candidates)} candidatos...")

                    enriched_candidates = await self._enrich_candidates(db, candidates)
                    phase2_result = await phase2_deep_compare(agent_results, enriched_candidates)

                    if phase2_result is not None:
                        await self._process_ai_result(
                            phase2_result, video, db, agent_results, frames,
                            surfist_profiles, folder_descriptors, video_descriptor,
                            debug_cb, _progress, job, phase=2,
                        )
                        return
                    else:
                        surfist = await self._create_surfist(db, video, agent_results, video_descriptor)
                        status = ClassificationStatus.AUTO_CLASSIFIED
                        reason = f"IA: criou novo perfil (fase 2 indisponivel). {reasoning}"
                else:
                    surfist = await self._create_surfist(db, video, agent_results, video_descriptor)
                    status = ClassificationStatus.AUTO_CLASSIFIED
                    reason = f"IA: novo surfista (sem candidatos para fase 2). {reasoning}"
            else:
                surfist = await self._create_surfist(db, video, agent_results, video_descriptor)
                status = ClassificationStatus.AUTO_CLASSIFIED
                reason = f"IA ({phase_label}): novo surfista. {reasoning}"

            if debug_cb:
                await debug_cb({"type": "pipeline_status", "video_id": video.id, "phase": "new_surfist",
                    "pct": 90, "detail": f"Novo surfista criado: {surfist.name}", "surfist_name": surfist.name})
        else:
            if phase == 2 and confidence < settings.PHASE2_THRESHOLD:
                surfist = None
                status = ClassificationStatus.UNCLASSIFIED
                reason = f"IA: nao classificado apos fase 2 (confianca {confidence:.0%} < {settings.PHASE2_THRESHOLD:.0%}). {reasoning}"
            else:
                surfist = await self._assign_to_existing(db, matched_id, video, agent_results, video_descriptor) if matched_id else None
                if surfist:
                    status = ClassificationStatus.PENDING_REVIEW
                    reason = f"IA ({phase_label}): confianca intermediaria ({confidence:.0%}). {reasoning}"
                else:
                    surfist = await self._create_surfist(db, video, agent_results, video_descriptor)
                    status = ClassificationStatus.AUTO_CLASSIFIED
                    reason = f"IA ({phase_label}): novo surfista. {reasoning}"

        if debug_cb:
            await debug_cb({"type": "pipeline_status", "video_id": video.id, "phase": "auto_learning",
                "pct": 92, "detail": reason, "final_status": status.value if isinstance(status, ClassificationStatus) else status,
                "final_confidence": confidence})

        await _progress(92, reason)
        self._write_video_results(video, agent_results, confidence, status, surfist, reason,
            ai_fusion_info={"used_openrouter": True, "phase": phase, "ai_result": ai_result})
        job.status = "done"
        job.progress = 100
        job.completed_at = datetime.utcnow()
        await db.commit()

        if debug_cb:
            await debug_cb({"type": "pipeline_complete", "video_id": video.id, "pct": 100,
                "detail": "Classificacao completa", "surfist_id": video.surfist_id,
                "surfist_name": surfist.name if surfist else None,
                "status": video.status.value, "confidence": round(video.final_confidence, 4), "reason": reason})

        await _progress(100, "Classification complete")

    async def _process_fallback(
        self, video: Video, db: AsyncSession,
        agent_results: List[AgentResult], frames: List[Any],
        surfist_profiles: Dict, folder_descriptors: Dict,
        video_descriptor: dict, debug_cb, _progress, job,
    ):
        if debug_cb:
            await debug_cb({"type": "pipeline_status", "video_id": video.id, "phase": "fallback",
                "pct": 80, "detail": "OpenRouter indisponivel — usando classificacao local"})

        fusion = fallback_classify(agent_results)
        agent_details = await self._apply_auto_learning(
            video=video, db=db, frames=frames, agent_results=agent_results,
            surfist_profiles=surfist_profiles, fusion=fusion,
        )

        surfist = None
        if fusion.surfist_id:
            r = await db.execute(select(Surfist).where(Surfist.id == fusion.surfist_id))
            surfist = r.scalar_one_or_none()

        self._write_video_results(
            video, agent_results, fusion.final_confidence, fusion.status,
            surfist, agent_details.get("reason", ""),
            ai_fusion_info={"used_openrouter": False, "phase": "fallback"},
        )
        job.status = "done"
        job.progress = 100
        job.completed_at = datetime.utcnow()
        await db.commit()

        if debug_cb:
            await debug_cb({"type": "pipeline_complete", "video_id": video.id, "pct": 100,
                "detail": "Classificacao local completa", "status": video.status.value,
                "confidence": round(video.final_confidence, 4),
                "surfist_id": video.surfist_id, "surfist_name": surfist.name if surfist else None,
                "reason": agent_details.get("reason", "")})

        await _progress(100, "Classification complete (fallback)")

    def _write_video_results(self, video: Video, agent_results, confidence, status, surfist, reason, ai_fusion_info=None):
        face_r, pose_r, board_r, clothing_r = agent_results
        video.face_confidence = face_r.confidence
        video.pose_confidence = pose_r.confidence
        video.board_confidence = board_r.confidence
        video.clothing_confidence = clothing_r.confidence
        video.final_confidence = confidence
        video.face_surfist_id = face_r.surfist_id
        video.pose_surfist_id = pose_r.surfist_id
        video.board_surfist_id = board_r.surfist_id
        video.clothing_surfist_id = clothing_r.surfist_id
        video.status = status
        video.processed_at = datetime.utcnow()

        if surfist:
            video.surfist_id = surfist.id

        vid_stem = Path(video.file_path).stem
        features_path = Path(settings.FEATURES_PATH)
        video.face_crop_path = str(features_path / f"{vid_stem}_face.jpg") if (features_path / f"{vid_stem}_face.jpg").exists() else None
        video.pose_sketch_path = str(features_path / f"{vid_stem}_pose.jpg") if (features_path / f"{vid_stem}_pose.jpg").exists() else None
        video.board_crop_path = str(features_path / f"{vid_stem}_board.jpg") if (features_path / f"{vid_stem}_board.jpg").exists() else None

        video.agent_details = {
            "reason": reason,
            "agents": {r.agent_name: r.to_dict() for r in agent_results},
            "video_descriptor": self._build_video_descriptor(agent_results),
            "ai_fusion": ai_fusion_info or {"used_openrouter": False, "phase": "unknown"},
        }

    def _build_video_descriptor(self, agent_results: List[AgentResult]) -> dict:
        descriptor = {}
        for r in agent_results:
            key = {
                "FaceAgent": "rosto", "PoseAgent": "postura",
                "BoardAgent": "prancha", "ClothingAgent": "roupa",
            }.get(r.agent_name, r.agent_name)
            descriptor[key] = r.description or "nao detectado"
        return descriptor

    async def _load_folder_descriptors(self, db: AsyncSession) -> Dict[str, dict]:
        result = await db.execute(select(Surfist).where(Surfist.is_active == True))
        surfists = result.scalars().all()
        descriptors = {}
        for s in surfists:
            desc = s.folder_descriptor if isinstance(s.folder_descriptor, dict) else {}
            descriptors[s.id] = {
                "name": s.name,
                "display_id": s.display_id,
                "descriptor": desc,
                "video_count": len(s.reference_images or []),
            }
        return descriptors

    def _get_candidates(self, folder_descriptors: Dict, ai_result: dict) -> Dict[str, dict]:
        if not folder_descriptors:
            return {}
        all_folders = dict(folder_descriptors)
        matched_id = ai_result.get("matched_folder_id")
        if matched_id and matched_id in all_folders:
            best = {matched_id: all_folders[matched_id]}
            others = {k: v for k, v in all_folders.items() if k != matched_id}
            sorted_others = sorted(others.items(), key=lambda x: x[1].get("video_count", 0), reverse=True)
            for k, v in sorted_others[:2]:
                best[k] = v
            return best
        return dict(list(all_folders.items())[:3])

    async def _enrich_candidates(self, db: AsyncSession, candidates: Dict) -> Dict:
        for fid in candidates:
            result = await db.execute(select(Surfist).where(Surfist.id == fid))
            surfist = result.scalar_one_or_none()
            if surfist:
                video_descs = []
                vids_result = await db.execute(
                    select(Video).where(Video.surfist_id == fid).limit(2)
                )
                for v in vids_result.scalars().all():
                    details = v.agent_details if isinstance(v.agent_details, dict) else {}
                    vd = details.get("video_descriptor", {})
                    if vd:
                        video_descs.append("; ".join(f"{k}: {val}" for k, val in vd.items()))
                candidates[fid]["video_descriptions"] = video_descs
        return candidates

    async def _assign_to_existing(self, db: AsyncSession, surfist_id: str, video: Video,
                                   agent_results: List[AgentResult], video_descriptor: dict) -> Surfist:
        result = await db.execute(select(Surfist).where(Surfist.id == surfist_id))
        surfist = result.scalar_one_or_none()
        if not surfist:
            return await self._create_surfist(db, video, agent_results, video_descriptor)
        self._append_embeddings(surfist, agent_results)
        current_desc = surfist.folder_descriptor if isinstance(surfist.folder_descriptor, dict) else {}
        if not current_desc:
            surfist.folder_descriptor = video_descriptor
        refs = list(surfist.reference_images or [])
        if video.thumbnail_path and video.thumbnail_path not in refs:
            refs.append(video.thumbnail_path)
            surfist.reference_images = refs[-8:]
        return surfist

    async def _create_surfist(self, db: AsyncSession, video: Video,
                               agent_results: List[AgentResult], video_descriptor: dict) -> Surfist:
        max_result = await db.execute(select(func.max(Surfist.display_id)))
        display_id = (max_result.scalar() or 0) + 1
        palette = ["#0EA5E9", "#10B981", "#F59E0B", "#F43F5E", "#8B5CF6", "#14B8A6", "#EAB308", "#EC4899"]
        surfist = Surfist(
            name=f"Surfista {display_id}",
            display_id=display_id,
            color_hex=palette[(display_id - 1) % len(palette)],
            reference_images=[self._reference_image_for(video, [])],
            folder_descriptor=video_descriptor,
        )
        self._append_embeddings(surfist, agent_results)
        db.add(surfist)
        await db.flush()
        return surfist

    async def _apply_auto_learning(self, video, db, frames, agent_results, surfist_profiles, fusion):
        signal = self._signal_summary(agent_results)
        if not signal["has_person"]:
            fusion.surfist_id = None
            fusion.status = ClassificationStatus.UNCLASSIFIED
            fusion.final_confidence = 0.0
            details = fusion.to_dict()
            details["reason"] = "Nao classificado: nenhum agente encontrou sinal confiavel de surfista."
            details["signal_summary"] = signal
            return details
        if not surfist_profiles:
            surfist = await self._create_surfist(db, video, agent_results, self._build_video_descriptor(agent_results))
            fusion.surfist_id = surfist.id
            fusion.status = ClassificationStatus.AUTO_CLASSIFIED
            fusion.final_confidence = max(0.88, signal["quality_score"])
            details = fusion.to_dict()
            details["reason"] = f"Primeiro perfil criado: {surfist.folder_name}."
            details["signal_summary"] = signal
            return details
        if fusion.status == ClassificationStatus.AUTO_CLASSIFIED and fusion.surfist_id:
            await self._append_embeddings_to_surfist(db, fusion.surfist_id, video, agent_results)
            details = fusion.to_dict()
            details["reason"] = f"{details.get('reason', '')} Perfil reforcado."
            details["signal_summary"] = signal
            return details
        if fusion.status == ClassificationStatus.UNCLASSIFIED:
            fusion.surfist_id = None
            fusion.status = ClassificationStatus.PENDING_REVIEW
            fusion.final_confidence = max(0.40, min(0.78, signal["quality_score"] - 0.12))
            details = fusion.to_dict()
            details["reason"] = "Revisao humana necessaria: agentes nao conseguiram classificar."
            details["signal_summary"] = signal
            return details
        details = fusion.to_dict()
        details["signal_summary"] = signal
        return details

    @staticmethod
    def _signal_summary(agent_results):
        person_agents = [r.agent_name for r in agent_results if r.agent_name in {"FaceAgent", "PoseAgent", "ClothingAgent"} and r.embedding is not None]
        board_signal = any(r.agent_name == "BoardAgent" and r.embedding is not None for r in agent_results)
        quality_score = min(0.96, 0.52 + (0.14 * len(person_agents)) + (0.08 if board_signal else 0.0))
        return {"has_person": len(person_agents) > 0, "person_agents": person_agents, "board_signal": board_signal, "quality_score": round(quality_score, 4), "agent_errors": {r.agent_name: r.error for r in agent_results if r.error}}

    async def _append_embeddings_to_surfist(self, db, surfist_id, video, agent_results):
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
    def _append_embeddings(surfist, agent_results):
        mapping = {"FaceAgent": "face_embeddings", "PoseAgent": "pose_embeddings", "ClothingAgent": "clothing_embeddings", "BoardAgent": "board_features"}
        for result in agent_results:
            attr = mapping.get(result.agent_name)
            if not attr or result.embedding is None:
                continue
            values = list(getattr(surfist, attr) or [])
            values.append(result.embedding.tolist())
            setattr(surfist, attr, values[-24:])

    @staticmethod
    def _reference_image_for(video, frames):
        if video.thumbnail_path:
            return video.thumbnail_path
        try:
            import cv2
            out_path = Path(settings.THUMBNAILS_PATH) / f"ref_auto_{video.id}.jpg"
            if frames:
                frame = frames[len(frames) // 2]
                cv2.imwrite(str(out_path), frame, [cv2.IMWRITE_JPEG_QUALITY, 88])
                return str(out_path)
        except Exception:
            pass
        return ""

    @staticmethod
    async def _load_surfist_profiles(db):
        result = await db.execute(select(Surfist).where(Surfist.is_active == True))
        surfists = result.scalars().all()
        return {s.id: {"face_embeddings": s.face_embeddings or [], "pose_embeddings": s.pose_embeddings or [],
            "clothing_embeddings": s.clothing_embeddings or [], "board_features": s.board_features or [],
            "name": s.name, "display_id": s.display_id} for s in surfists}


classification_pipeline = ClassificationPipeline()
