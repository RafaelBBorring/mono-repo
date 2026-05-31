"""
Agent 1 – Face Recognition

Strategy:
  • Samples every Nth frame from the video
  • Detects and embeds all faces in each frame using DeepFace (FaceNet512)
  • Averages valid embeddings into a single 512-dim vector
  • Compares against stored face embeddings via cosine similarity
  • Exports the best-quality face crop for the review UI
"""

import asyncio
import os
from pathlib import Path
from typing import Any, Dict, List, Optional

import cv2
import numpy as np
from loguru import logger

from agents.base_agent import AgentResult, BaseAgent
from config import settings


class FaceAgent(BaseAgent):

    def __init__(self):
        super().__init__(name="FaceAgent", weight=settings.FACE_WEIGHT)
        self._deepface = None  # Lazy import after initialize()

    # ── Initialization ────────────────────────────────────────────────────────

    async def initialize(self) -> None:
        """Import DeepFace (heavy – runs once)."""
        def _import():
            import deepface  # noqa: F401 – warm-up the import
            from deepface import DeepFace
            return DeepFace

        self._deepface = await asyncio.to_thread(_import)
        logger.info("[FaceAgent] DeepFace initialized with model: %s", settings.FACE_MODEL)

    # ── Feature Extraction ────────────────────────────────────────────────────

    async def extract_features(
        self,
        video_path: str,
        frames: List[np.ndarray],
    ) -> Optional[np.ndarray]:
        """Return averaged 512-dim FaceNet embedding, or None if no face found."""
        embeddings: List[np.ndarray] = []
        best_frame: Optional[np.ndarray] = None
        best_face_size: int = 0

        for frame in frames:
            result = await asyncio.to_thread(self._embed_frame, frame)
            if result is not None:
                emb, face_region, face_img = result
                embeddings.append(emb)
                # Keep the largest (best quality) face crop for the review UI
                size = face_region.get("w", 0) * face_region.get("h", 0)
                if size > best_face_size:
                    best_face_size = size
                    best_frame = face_img

        if not embeddings:
            logger.debug("[FaceAgent] No faces detected in %d frames", len(frames))
            return None

        # Save best face crop
        if best_frame is not None:
            self._save_crop(best_frame, video_path)

        # Average all valid embeddings
        avg_embedding = np.mean(embeddings, axis=0)
        return avg_embedding.astype(np.float32)

    def _embed_frame(self, frame: np.ndarray):
        """
        Run DeepFace on a single frame. Returns (embedding, face_region, face_img)
        or None if no face found.  Runs in a thread (CPU-bound).
        """
        try:
            results = self._deepface.represent(
                img_path=frame,
                model_name=settings.FACE_MODEL,
                detector_backend=settings.FACE_DETECTOR,
                enforce_detection=True,
                align=True,
            )
            if results:
                r = results[0]  # Take the most prominent face
                emb = np.array(r["embedding"], dtype=np.float32)
                region = r.get("facial_area", {})
                # Crop face from frame
                x, y = region.get("x", 0), region.get("y", 0)
                w, h = region.get("w", 80), region.get("h", 80)
                face_img = frame[y:y+h, x:x+w]
                return emb, region, face_img
        except Exception:
            # No face detected – silently skip this frame
            pass
        return None

    # ── Database Matching ─────────────────────────────────────────────────────

    async def match_database(
        self,
        embedding: np.ndarray,
        surfist_profiles: Dict[str, Any],
    ) -> AgentResult:
        """Compare embedding against all surfist face embeddings."""
        # Build profile dict {surfist_id: [list_of_embeddings]}
        face_profiles: Dict[str, List[List[float]]] = {
            sid: profile.get("face_embeddings", [])
            for sid, profile in surfist_profiles.items()
            if profile.get("face_embeddings")
        }

        if not face_profiles:
            return AgentResult(
                agent_name=self.name,
                surfist_id=None,
                confidence=0.0,
                embedding=embedding,
                features={"matched_faces": 0},
                error="No face embeddings in database",
            )

        surfist_id, confidence = self.best_match(
            embedding, face_profiles, threshold=settings.FACE_SIM_THRESHOLD
        )

        # Compute per-surfist similarities for rich UI display
        similarities = {}
        for sid, embs in face_profiles.items():
            if embs:
                sims = [self.cosine_similarity(embedding, np.array(e)) for e in embs]
                similarities[sid] = round(max(sims), 4)

        return AgentResult(
            agent_name=self.name,
            surfist_id=surfist_id,
            confidence=confidence,
            embedding=embedding,
            features={
                "model": settings.FACE_MODEL,
                "embedding_dim": len(embedding),
                "per_surfist_similarity": similarities,
            },
        )

    # ── Helpers ───────────────────────────────────────────────────────────────

    def _save_crop(self, face_img: np.ndarray, video_path: str) -> Optional[str]:
        """Save face crop image next to the video in the features folder."""
        try:
            vid_stem = Path(video_path).stem
            out_path = Path(settings.FEATURES_PATH) / f"{vid_stem}_face.jpg"
            cv2.imwrite(str(out_path), face_img)
            return str(out_path)
        except Exception as e:
            logger.warning("[FaceAgent] Could not save face crop: %s", e)
            return None

    # ── Embedding extraction for registration ─────────────────────────────────

    async def embed_reference_image(self, image_path: str) -> Optional[np.ndarray]:
        """
        Extract a face embedding from a reference photo during surfist registration.
        Returns None if no face found.
        """
        if not self._initialized:
            await self.initialize()
            self._initialized = True

        frame = await asyncio.to_thread(cv2.imread, image_path)
        if frame is None:
            return None
        result = await asyncio.to_thread(self._embed_frame, frame)
        if result is None:
            return None
        emb, _, _ = result
        return emb.astype(np.float32)
