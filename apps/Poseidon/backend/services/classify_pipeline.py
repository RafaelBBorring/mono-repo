"""
Classification Pipeline

Orchestrates:
  1. Frame extraction
  2. All 4 agents running concurrently via asyncio.gather()
  3. Fusion & decision engine
  4. DB write-back
  5. WebSocket progress updates
"""

import asyncio
from datetime import datetime
from pathlib import Path
from typing import Any, Callable, Dict, List, Optional

from loguru import logger
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from agents.face_agent     import FaceAgent
from agents.pose_agent     import PoseAgent
from agents.board_agent    import BoardAgent
from agents.clothing_agent import ClothingAgent
from fusion.decision_engine import decision_engine
from models import ClassificationStatus, ProcessingJob, Surfist, Video
from services.video_processor import video_processor
from config import settings


# ── Singleton agents (loaded once) ────────────────────────────────────────────
_face_agent     = FaceAgent()
_pose_agent     = PoseAgent()
_board_agent    = BoardAgent()
_clothing_agent = ClothingAgent()


class ClassificationPipeline:
    """
    One instance handles all video classification work.
    Progress is broadcast via an optional async callback.
    """

    async def run(
        self,
        video: Video,
        db: AsyncSession,
        progress_cb: Optional[Callable[[float, str], Any]] = None,
    ) -> None:
        """
        Full pipeline for one video.

        Args:
            video:       ORM Video object (already in session)
            db:          Async DB session
            progress_cb: async callable(percent, message) for WebSocket updates
        """
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
            await _progress(5, "Extracting frames")
            frames = await video_processor.extract_frames(video.file_path)
            if not frames:
                raise RuntimeError("No frames could be extracted from video")
            await _progress(15, f"Extracted {len(frames)} frames")

            # ── Step 2: Load surfist profiles ─────────────────────────────
            await _progress(20, "Loading surfist profiles")
            surfist_profiles = await self._load_surfist_profiles(db)
            await _progress(25, f"Loaded {len(surfist_profiles)} surfist profiles")

            # ── Step 3: Run all 4 agents concurrently ─────────────────────
            await _progress(30, "Running AI agents")

            face_task     = _face_agent.analyze(video.file_path, frames, surfist_profiles)
            pose_task     = _pose_agent.analyze(video.file_path, frames, surfist_profiles)
            board_task    = _board_agent.analyze(video.file_path, frames, surfist_profiles)
            clothing_task = _clothing_agent.analyze(video.file_path, frames, surfist_profiles)

            results = await asyncio.gather(
                face_task, pose_task, board_task, clothing_task,
                return_exceptions=True,
            )

            # Unwrap any exceptions that slipped through gather
            agent_results = []
            for r in results:
                if isinstance(r, Exception):
                    from agents.base_agent import AgentResult
                    agent_results.append(AgentResult(
                        agent_name="Unknown", surfist_id=None,
                        confidence=0.0, error=str(r),
                    ))
                else:
                    agent_results.append(r)

            face_r, pose_r, board_r, clothing_r = agent_results
            await _progress(75, "Agents complete – fusing results")

            # ── Step 4: Fusion ─────────────────────────────────────────────
            fusion = decision_engine.fuse(agent_results)
            agent_details = await self._apply_auto_learning(
                video=video,
                db=db,
                frames=frames,
                agent_results=agent_results,
                surfist_profiles=surfist_profiles,
                fusion=fusion,
            )
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

            # Paths to extracted evidence
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

            await _progress(100, "Classification complete")
            logger.info(
                "[Pipeline] Video %s → %s (confidence=%.3f)",
                video.id, fusion.status.value, fusion.final_confidence,
            )

        except Exception as exc:
            logger.error("[Pipeline] Error processing video %s: %s", video.id, exc)
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
