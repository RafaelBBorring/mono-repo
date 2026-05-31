"""
Agent 4 – Clothing Recognition

Strategy:
  • Detects the surfer's torso region using MediaPipe pose landmarks
    (shoulders → hips bounding box)
  • Extracts a combined clothing fingerprint:
      – RGB color histogram (48-dim: 16 bins × 3 channels)
      – HSV color histogram (48-dim: 16 bins × 3 channels)
      – LBP texture histogram (26-dim: uniform patterns)
  • Total embedding: 122-dim vector
  • Matches against stored clothing embeddings via cosine similarity
"""

import asyncio
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import cv2
import numpy as np
from loguru import logger

from agents.base_agent import AgentResult, BaseAgent
from config import settings

_L_SHOULDER = 11; _R_SHOULDER = 12
_L_HIP      = 23; _R_HIP      = 24
_L_KNEE     = 25; _R_KNEE     = 26


class ClothingAgent(BaseAgent):

    def __init__(self):
        super().__init__(name="ClothingAgent", weight=settings.CLOTHING_WEIGHT)
        self._pose = None
        self._mp_pose = None

    async def initialize(self) -> None:
        def _import():
            import mediapipe as mp
            pose = mp.solutions.pose.Pose(
                static_image_mode=True,
                model_complexity=1,
                min_detection_confidence=0.45,
            )
            return mp.solutions.pose, pose

        self._mp_pose, self._pose = await asyncio.to_thread(_import)
        logger.info("[ClothingAgent] MediaPipe Pose initialized for clothing detection")

    async def extract_features(
        self,
        video_path: str,
        frames: List[np.ndarray],
    ) -> Optional[np.ndarray]:
        fingerprints: List[np.ndarray] = []

        for frame in frames:
            result = await asyncio.to_thread(self._extract_clothing, frame)
            if result is not None:
                fingerprints.append(result)

        if not fingerprints:
            logger.debug("[ClothingAgent] No clothing regions detected in %d frames", len(frames))
            return None

        return np.mean(fingerprints, axis=0).astype(np.float32)

    def _extract_clothing(self, frame: np.ndarray) -> Optional[np.ndarray]:
        try:
            rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            res = self._pose.process(rgb)
            if not res.pose_landmarks:
                return None

            lm = res.pose_landmarks.landmark
            h, w = frame.shape[:2]

            def pt(idx):
                p = lm[idx]
                return int(p.x * w), int(p.y * h)

            ls = pt(_L_SHOULDER)
            rs = pt(_R_SHOULDER)
            lh = pt(_L_HIP)
            rh = pt(_R_HIP)

            x1 = max(0, min(ls[0], rs[0]) - int(0.05 * w))
            y1 = max(0, min(ls[1], rs[1]) - int(0.02 * h))
            x2 = min(w, max(lh[0], rh[0]) + int(0.05 * w))
            y2 = min(h, max(lh[1], rh[1]) + int(0.02 * h))

            if x2 - x1 < 20 or y2 - y1 < 20:
                return None

            torso = frame[y1:y2, x1:x2]
            if torso.size == 0:
                return None

            rgb_hist = self._color_histogram(torso, "RGB")
            hsv_hist = self._color_histogram(torso, "HSV")
            lbp_hist = self._lbp_histogram(torso)

            return np.concatenate([rgb_hist, hsv_hist, lbp_hist])

        except Exception:
            return None

    @staticmethod
    def _color_histogram(region: np.ndarray, space: str) -> np.ndarray:
        if space == "HSV":
            converted = cv2.cvtColor(region, cv2.COLOR_BGR2HSV)
        else:
            converted = cv2.cvtColor(region, cv2.COLOR_BGR2RGB)

        hists = []
        for ch in range(3):
            hist = cv2.calcHist([converted], [ch], None, [16], [0, 256])
            hist = cv2.normalize(hist, hist).flatten()
            hists.append(hist)

        return np.concatenate(hists)

    @staticmethod
    def _lbp_histogram(region: np.ndarray, num_points: int = 24, radius: int = 3) -> np.ndarray:
        gray = cv2.cvtColor(region, cv2.COLOR_BGR2GRAY)
        gray = cv2.resize(gray, (128, 128))

        lbp = np.zeros_like(gray)
        for i in range(num_points):
            angle = 2 * np.pi * i / num_points
            x = int(round(radius * np.cos(angle)))
            y = int(round(radius * np.sin(angle)))
            shifted = np.roll(np.roll(gray, -y, axis=0), -x, axis=1)
            lbp += ((shifted >= gray) * (1 << i)).astype(np.uint8)

        n_bins = 2 ** num_points
        hist, _ = np.histogram(lbp.ravel(), bins=n_bins, range=(0, n_bins))
        hist = hist.astype(np.float32)
        hist = hist / (hist.sum() + 1e-7)
        n_uniform = num_points * (num_points - 1) + 3
        uniform_hist = np.zeros(n_uniform, dtype=np.float32)
        uniform_hist[0] = hist[0]
        uniform_hist[1] = hist[1]
        for p in range(2, n_bins - 1):
            bin_idx = min(p, n_uniform - 1)
            uniform_hist[bin_idx] += hist[p]
        uniform_hist[-1] = hist[-1]

        return uniform_hist

    async def match_database(
        self,
        embedding: np.ndarray,
        surfist_profiles: Dict[str, Any],
    ) -> AgentResult:
        clothing_profiles: Dict[str, List[List[float]]] = {
            sid: profile.get("clothing_embeddings", [])
            for sid, profile in surfist_profiles.items()
            if profile.get("clothing_embeddings")
        }

        if not clothing_profiles:
            return AgentResult(
                agent_name=self.name,
                surfist_id=None,
                confidence=0.0,
                embedding=embedding,
                error="No clothing embeddings in database",
            )

        surfist_id, confidence = self.best_match(
            embedding, clothing_profiles, threshold=settings.CLOTHING_SIM_THRESHOLD
        )

        return AgentResult(
            agent_name=self.name,
            surfist_id=surfist_id,
            confidence=confidence,
            embedding=embedding,
            features={
                "fingerprint_dim": len(embedding),
                "method": "RGB+HSV_hist+LBP",
            },
        )
