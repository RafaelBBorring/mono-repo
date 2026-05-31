"""
Agent 4 – Surf Style & Maneuver Pattern

Strategy:
  • Extracts MediaPipe pose landmarks for every sampled frame
  • Builds a temporal sequence of pose states
  • Computes movement features between consecutive frames:
      – angular velocity of key joints (knees, elbows, shoulders, hips)
      – lateral displacement (left/right weight shifts)
      – vertical oscillation (air height, crouch-and-pop rhythm)
      – center-of-mass trajectory
      – maneuver tempo (frequency of body-state transitions)
  • Aggregates into a compact 64-dim style signature vector
  • Each surfer has a unique "surfing fingerprint" from their biomechanics

  Note: This agent intentionally uses simple statistical features rather than
  a trained LSTM so it works without GPU/pre-trained weights.  The architecture
  is designed to be upgraded to a proper sequence model later.
"""

import asyncio
import math
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
_L_ANKLE    = 27; _R_ANKLE    = 28
_L_ELBOW    = 13; _R_ELBOW    = 14


class StyleAgent(BaseAgent):

    def __init__(self):
        super().__init__(name="StyleAgent", weight=settings.STYLE_WEIGHT)
        self._pose = None
        self._mp_pose = None

    # ── Initialization ────────────────────────────────────────────────────────

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
        logger.info("[StyleAgent] MediaPipe Pose (style mode) initialized")

    # ── Feature Extraction ────────────────────────────────────────────────────

    async def extract_features(
        self,
        video_path: str,
        frames: List[np.ndarray],
    ) -> Optional[np.ndarray]:
        """Return 64-dim style signature or None."""
        pose_sequence: List[np.ndarray] = []

        for frame in frames:
            landmarks = await asyncio.to_thread(self._extract_landmarks, frame)
            if landmarks is not None:
                pose_sequence.append(landmarks)

        if len(pose_sequence) < 4:
            logger.debug("[StyleAgent] Too few pose frames (%d) for style analysis",
                         len(pose_sequence))
            return None

        signature = self._compute_style_signature(pose_sequence)
        return signature.astype(np.float32)

    def _extract_landmarks(self, frame: np.ndarray) -> Optional[np.ndarray]:
        """Return flat (x, y) array of 33 landmarks normalised to [0,1], or None."""
        try:
            rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            res = self._pose.process(rgb)
            if not res.pose_landmarks:
                return None
            lm = res.pose_landmarks.landmark
            # Extract (x, y) for 33 landmarks → 66-dim vector
            vec = np.array([(p.x, p.y) for p in lm], dtype=np.float32).flatten()
            return vec  # shape (66,)
        except Exception:
            return None

    def _compute_style_signature(
        self, pose_sequence: List[np.ndarray]
    ) -> np.ndarray:
        """
        Build a 64-dim style vector from a temporal pose sequence.

        Feature blocks (each 8-dim):
          Block 0: Center-of-mass trajectory statistics
          Block 1: Vertical oscillation (rhythm / air pops)
          Block 2: Lateral weight shift statistics
          Block 3: Knee joint velocity statistics (crouch-and-pop signature)
          Block 4: Shoulder rotation statistics
          Block 5: Hip sway statistics
          Block 6: Temporal rate features (maneuver tempo)
          Block 7: Overall posture statistics (mean pose)
        """
        seq = np.stack(pose_sequence)  # (T, 66)
        T = seq.shape[0]

        def _pt(frame_vec: np.ndarray, idx: int) -> np.ndarray:
            """Extract (x, y) for landmark index from 66-dim vector."""
            return frame_vec[idx*2: idx*2+2]

        def _stats(arr: np.ndarray) -> np.ndarray:
            """8 statistics: mean, std, min, max, q25, q75, kurtosis_proxy, range."""
            if len(arr) < 2:
                return np.zeros(8, dtype=np.float32)
            return np.array([
                np.mean(arr), np.std(arr), np.min(arr), np.max(arr),
                np.percentile(arr, 25), np.percentile(arr, 75),
                np.mean(np.abs(arr - np.mean(arr))),  # mean abs deviation
                np.max(arr) - np.min(arr),            # range
            ], dtype=np.float32)

        # Helper: extract one landmark position across all frames
        def _track(idx: int) -> np.ndarray:
            return np.array([_pt(seq[t], idx) for t in range(T)])  # (T, 2)

        # ── Block 0: Centre of mass (average of hips + shoulders) ─────────────
        com_x = (seq[:, _L_HIP*2]  + seq[:, _R_HIP*2] +
                 seq[:, _L_SHOULDER*2] + seq[:, _R_SHOULDER*2]) / 4
        com_y = (seq[:, _L_HIP*2+1] + seq[:, _R_HIP*2+1] +
                 seq[:, _L_SHOULDER*2+1] + seq[:, _R_SHOULDER*2+1]) / 4
        b0 = _stats(np.diff(com_x))  # COM horizontal velocity

        # ── Block 1: Vertical oscillation ─────────────────────────────────────
        b1 = _stats(np.diff(com_y))  # COM vertical velocity

        # ── Block 2: Lateral weight shift (left ankle x − right ankle x) ──────
        l_ankle_x = seq[:, _L_ANKLE*2]
        r_ankle_x = seq[:, _R_ANKLE*2]
        weight_shift = l_ankle_x - r_ankle_x
        b2 = _stats(np.diff(weight_shift))

        # ── Block 3: Knee angle proxy (hip–knee–ankle y distances) ────────────
        lk_y = seq[:, _L_KNEE*2+1] - (seq[:, _L_HIP*2+1] + seq[:, _L_ANKLE*2+1]) / 2
        rk_y = seq[:, _R_KNEE*2+1] - (seq[:, _R_HIP*2+1] + seq[:, _R_ANKLE*2+1]) / 2
        knee_proxy = (lk_y + rk_y) / 2
        b3 = _stats(np.diff(knee_proxy))

        # ── Block 4: Shoulder rotation (dx between L and R shoulder) ──────────
        shoulder_dx = seq[:, _L_SHOULDER*2] - seq[:, _R_SHOULDER*2]
        b4 = _stats(np.diff(shoulder_dx))

        # ── Block 5: Hip sway (dx between L and R hip) ───────────────────────
        hip_dx = seq[:, _L_HIP*2] - seq[:, _R_HIP*2]
        b5 = _stats(np.diff(hip_dx))

        # ── Block 6: Temporal rates (zero-crossings, peaks in key signals) ────
        def _zcr(signal: np.ndarray) -> float:
            centered = signal - signal.mean()
            return float(np.sum(np.abs(np.diff(np.sign(centered)))) / (2 * max(len(signal)-1, 1)))

        com_y_d1 = np.diff(com_y)
        b6 = np.array([
            _zcr(com_y),         # vertical oscillation rate
            _zcr(weight_shift),  # weight-shift frequency
            _zcr(knee_proxy),    # crouch frequency
            _zcr(shoulder_dx),   # shoulder rotation rate
            float(T),            # total pose-detected frames (proxy for activity)
            np.std(np.diff(com_y_d1)) if len(com_y_d1)>1 else 0,  # jerk
            np.mean(np.abs(com_y_d1)),   # mean vertical speed
            np.mean(np.abs(np.diff(com_x))),  # mean horizontal speed
        ], dtype=np.float32)

        # ── Block 7: Mean pose (overall posture summary) ──────────────────────
        mean_pose = seq.mean(axis=0)  # (66,)
        # Summarize as 8 key features from mean pose
        b7 = np.array([
            mean_pose[_L_SHOULDER*2+1],  # shoulder height
            mean_pose[_L_HIP*2+1],       # hip height
            mean_pose[_L_KNEE*2+1],      # knee height
            mean_pose[_L_ANKLE*2+1],     # ankle height
            mean_pose[_L_SHOULDER*2] - mean_pose[_R_SHOULDER*2],  # shoulder width
            mean_pose[_L_HIP*2]      - mean_pose[_R_HIP*2],       # hip width
            mean_pose[_L_ANKLE*2]    - mean_pose[_R_ANKLE*2],     # stance
            mean_pose[_L_KNEE*2+1]   - mean_pose[_L_HIP*2+1],    # thigh angle proxy
        ], dtype=np.float32)

        signature = np.concatenate([b0, b1, b2, b3, b4, b5, b6, b7])  # (64,)
        return signature

    # ── Database Matching ─────────────────────────────────────────────────────

    async def match_database(
        self,
        embedding: np.ndarray,
        surfist_profiles: Dict[str, Any],
    ) -> AgentResult:
        style_profiles: Dict[str, List[List[float]]] = {
            sid: profile.get("style_embeddings", [])
            for sid, profile in surfist_profiles.items()
            if profile.get("style_embeddings")
        }

        if not style_profiles:
            return AgentResult(
                agent_name=self.name,
                surfist_id=None,
                confidence=0.0,
                embedding=embedding,
                error="No style embeddings in database",
            )

        surfist_id, confidence = self.best_match(
            embedding, style_profiles, threshold=settings.STYLE_SIM_THRESHOLD
        )

        return AgentResult(
            agent_name=self.name,
            surfist_id=surfist_id,
            confidence=confidence,
            embedding=embedding,
            features={
                "signature_dim": len(embedding),
                "method": "temporal_pose_statistics",
            },
        )
