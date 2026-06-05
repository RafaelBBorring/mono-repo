"""
Agent 1 – Face Recognition

Strategy:
  • Uses InsightFace (buffalo_l) to detect and embed faces in video frames
  • InsightFace uses RetinaFace detector + ArcFace embeddings (512-dim)
  • Runs on CPU via ONNX Runtime (no TensorFlow needed)
  • Averages valid embeddings into a single 512-dim vector
  • Compares against stored face embeddings via cosine similarity
  • Exports the best-quality face crop for the review UI
"""

import asyncio
from pathlib import Path
from typing import Any, Dict, List, Optional

import cv2
import numpy as np
from loguru import logger

from agents.base_agent import AgentResult, BaseAgent
from config import settings
from utils.color_descriptions import describe_face


class FaceAgent(BaseAgent):

    def __init__(self):
        super().__init__(name="FaceAgent", weight=settings.FACE_WEIGHT)
        self._app = None
        self._last_face_crop = None

    async def initialize(self) -> None:
        def _init():
            import insightface
            from insightface.app import FaceAnalysis
            app = FaceAnalysis(
                name="buffalo_l",
                providers=["CPUExecutionProvider"],
            )
            app.prepare(ctx_id=0, det_size=(640, 640))
            return app

        self._app = await asyncio.to_thread(_init)
        logger.info("[FaceAgent] InsightFace initialized (buffalo_l + ArcFace)")

    async def extract_features(
        self,
        video_path: str,
        frames: List[np.ndarray],
    ) -> Optional[np.ndarray]:
        embeddings: List[np.ndarray] = []
        best_frame: Optional[np.ndarray] = None
        best_face_size: int = 0

        for frame in frames:
            result = await asyncio.to_thread(self._embed_frame, frame)
            if result is not None:
                emb, face_img, size = result
                embeddings.append(emb)
                if size > best_face_size:
                    best_face_size = size
                    best_frame = face_img

        if not embeddings:
            logger.debug("[FaceAgent] No faces detected in %d frames", len(frames))
            return None

        if best_frame is not None:
            self._save_crop(best_frame, video_path)

        avg_embedding = np.mean(embeddings, axis=0)
        self._last_face_crop = best_frame if best_frame is not None else None
        return avg_embedding.astype(np.float32)

    def _embed_frame(self, frame: np.ndarray):
        try:
            rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            faces = self._app.get(rgb)
            if not faces:
                return None

            best = max(faces, key=lambda f: (f.bbox[2] - f.bbox[0]) * (f.bbox[3] - f.bbox[1]))

            if best.embedding is None:
                return None

            emb = best.embedding.astype(np.float32)
            bbox = best.bbox.astype(int)
            x1, y1, x2, y2 = bbox[0], bbox[1], bbox[2], bbox[3]
            h, w = frame.shape[:2]
            x1, y1 = max(0, x1), max(0, y1)
            x2, y2 = min(w, x2), min(h, y2)
            face_img = frame[y1:y2, x1:x2]
            size = (x2 - x1) * (y2 - y1)
            return emb, face_img, size
        except Exception:
            return None

    async def match_database(
        self,
        embedding: np.ndarray,
        surfist_profiles: Dict[str, Any],
    ) -> AgentResult:
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

        similarities = {}
        for sid, embs in face_profiles.items():
            if embs:
                sims = [self.cosine_similarity(embedding, np.array(e)) for e in embs]
                similarities[sid] = round(max(sims), 4)

        description = describe_face(self._last_face_crop) if hasattr(self, '_last_face_crop') and self._last_face_crop is not None else "rosto nao detectado"
        return AgentResult(
            agent_name=self.name,
            surfist_id=surfist_id,
            confidence=confidence,
            embedding=embedding,
            description=description,
            features={
                "model": "InsightFace-ArcFace",
                "embedding_dim": len(embedding),
                "per_surfist_similarity": similarities,
            },
        )

    def _save_crop(self, face_img: np.ndarray, video_path: str) -> Optional[str]:
        try:
            vid_stem = Path(video_path).stem
            out_path = Path(settings.FEATURES_PATH) / f"{vid_stem}_face.jpg"
            cv2.imwrite(str(out_path), face_img)
            return str(out_path)
        except Exception as e:
            logger.warning("[FaceAgent] Could not save face crop: %s", e)
            return None

    async def embed_reference_image(self, image_path: str) -> Optional[np.ndarray]:
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
