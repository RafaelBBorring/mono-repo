"""
Agent 2 – Body Pose & Posture

Strategy:
  • Uses MediaPipe Pose to extract 33 full-body landmarks per frame
  • Computes a normalized biomechanical feature vector:
      – shoulder width / body height ratio
      – hip width / shoulder width ratio
      – average knee bend angle (crouch depth)
      – average elbow angle (arm extension)
      – stance width / hip width ratio
      – torso inclination angle
      – relative limb proportions
  • Averages feature vectors across frames → 20-dim pose signature
  • Cosine similarity match against stored pose signatures
  • Saves a wireframe skeleton PNG for the review UI
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
from utils.color_descriptions import describe_pose_features


# Landmark indices (MediaPipe 33-point model)
_NOSE        = 0
_L_SHOULDER  = 11; _R_SHOULDER = 12
_L_ELBOW     = 13; _R_ELBOW    = 14
_L_WRIST     = 15; _R_WRIST    = 16
_L_HIP       = 23; _R_HIP      = 24
_L_KNEE      = 25; _R_KNEE     = 26
_L_ANKLE     = 27; _R_ANKLE    = 28


class PoseAgent(BaseAgent):

    def __init__(self):
        super().__init__(name="PoseAgent", weight=settings.POSE_WEIGHT)
        self._mp_pose = None
        self._mp_drawing = None
        self._pose = None
        self._last_pose_features = None

    # ── Initialization ────────────────────────────────────────────────────────

    async def initialize(self) -> None:
        def _import():
            import mediapipe as mp
            pose = mp.solutions.pose.Pose(
                static_image_mode=True,
                model_complexity=1,
                enable_segmentation=False,
                min_detection_confidence=0.5,
            )
            return mp, pose

        mp_module, self._pose = await asyncio.to_thread(_import)
        self._mp_pose    = mp_module.solutions.pose
        self._mp_drawing = mp_module.solutions.drawing_utils
        logger.info("[PoseAgent] MediaPipe Pose initialized")

    # ── Feature Extraction ────────────────────────────────────────────────────

    async def extract_features(
        self,
        video_path: str,
        frames: List[np.ndarray],
    ) -> Optional[np.ndarray]:
        """Return averaged pose feature vector or None if pose never detected."""
        feature_vecs: List[np.ndarray] = []
        best_skeleton_frame: Optional[np.ndarray] = None
        best_pose_confidence: float = 0.0

        for frame in frames:
            result = await asyncio.to_thread(self._process_frame, frame)
            if result is not None:
                feat_vec, vis_frame, conf = result
                feature_vecs.append(feat_vec)
                if conf > best_pose_confidence:
                    best_pose_confidence = conf
                    best_skeleton_frame = vis_frame

        if not feature_vecs:
            logger.debug("[PoseAgent] No poses detected in %d frames", len(frames))
            return None

        # Save skeleton visualization
        if best_skeleton_frame is not None:
            self._save_skeleton(best_skeleton_frame, video_path)

        avg = np.mean(feature_vecs, axis=0).astype(np.float32)
        self._last_pose_features = avg
        return avg

    def _process_frame(
        self, frame: np.ndarray
    ) -> Optional[Tuple[np.ndarray, np.ndarray, float]]:
        """
        Run MediaPipe on one frame.
        Returns (feature_vector, annotated_frame, visibility_confidence) or None.
        """
        try:
            rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            results = self._pose.process(rgb)

            if not results.pose_landmarks:
                return None

            lm = results.pose_landmarks.landmark
            h, w = frame.shape[:2]

            def pt(idx) -> Tuple[float, float]:
                p = lm[idx]
                return p.x * w, p.y * h

            def dist(a, b) -> float:
                return math.hypot(a[0]-b[0], a[1]-b[1])

            def angle(a, b, c) -> float:
                """Angle at vertex b in triangle abc, in degrees [0,180]."""
                ba = (a[0]-b[0], a[1]-b[1])
                bc = (c[0]-b[0], c[1]-b[1])
                dot = ba[0]*bc[0] + ba[1]*bc[1]
                mag = math.hypot(*ba) * math.hypot(*bc)
                if mag < 1e-6:
                    return 0.0
                return math.degrees(math.acos(max(-1, min(1, dot / mag))))

            ls, rs = pt(_L_SHOULDER), pt(_R_SHOULDER)
            lh, rh = pt(_L_HIP),      pt(_R_HIP)
            lk, rk = pt(_L_KNEE),     pt(_R_KNEE)
            la, ra = pt(_L_ANKLE),    pt(_R_ANKLE)
            le, re = pt(_L_ELBOW),    pt(_R_ELBOW)
            lw, rw = pt(_L_WRIST),    pt(_R_WRIST)
            nose   = pt(_NOSE)

            shoulder_w = dist(ls, rs)
            hip_w      = dist(lh, rh)
            body_h     = dist(nose, (la[0]+ra[0])/2, ) if False else (
                dist(ls, lh) + dist(ls, rs) * 0.1 + dist(lh, lk) + dist(lk, la)
            )
            body_h = max(body_h, 1)

            knee_angle   = (angle(lh, lk, la) + angle(rh, rk, ra)) / 2
            elbow_angle  = (angle(ls, le, lw) + angle(rs, re, rw)) / 2
            stance_w     = dist(la, ra)
            torso_angle  = math.degrees(
                math.atan2(
                    (rh[1]+lh[1])/2 - (rs[1]+ls[1])/2,
                    (rh[0]+lh[0])/2 - (rs[0]+ls[0])/2,
                )
            )

            feature_vector = np.array([
                shoulder_w / body_h,          # normalized shoulder width
                hip_w / body_h,               # normalized hip width
                hip_w / max(shoulder_w, 1),   # hip-to-shoulder ratio
                knee_angle / 180.0,           # crouch depth [0,1]
                elbow_angle / 180.0,          # arm extension [0,1]
                stance_w / body_h,            # stance width
                stance_w / max(shoulder_w,1), # stance-to-shoulder ratio
                abs(torso_angle) / 90.0,      # torso lean [0,1]
                dist(ls, lh) / body_h,        # left torso proportion
                dist(rs, rh) / body_h,        # right torso proportion
                dist(lh, lk) / body_h,        # left femur proportion
                dist(rh, rk) / body_h,        # right femur proportion
                dist(lk, la) / body_h,        # left shin proportion
                dist(rk, ra) / body_h,        # right shin proportion
                dist(ls, le) / body_h,        # left upper arm
                dist(rs, re) / body_h,        # right upper arm
                dist(le, lw) / body_h,        # left forearm
                dist(re, rw) / body_h,        # right forearm
                shoulder_w / max(stance_w,1), # shoulder to stance ratio
                hip_w      / max(stance_w,1), # hip to stance ratio
            ], dtype=np.float32)

            # Average visibility as proxy for detection confidence
            visible = [lm[i].visibility for i in [
                _L_SHOULDER, _R_SHOULDER, _L_HIP, _R_HIP,
                _L_KNEE, _R_KNEE, _L_ANKLE, _R_ANKLE
            ]]
            conf = float(np.mean(visible))

            # Draw skeleton on a copy
            annotated = frame.copy()
            self._mp_drawing.draw_landmarks(
                annotated,
                results.pose_landmarks,
                self._mp_pose.POSE_CONNECTIONS,
            )
            return feature_vector, annotated, conf

        except Exception as e:
            logger.debug("[PoseAgent] Frame processing error: %s", e)
            return None

    # ── Database Matching ─────────────────────────────────────────────────────

    async def match_database(
        self,
        embedding: np.ndarray,
        surfist_profiles: Dict[str, Any],
    ) -> AgentResult:
        pose_profiles: Dict[str, List[List[float]]] = {
            sid: profile.get("pose_embeddings", [])
            for sid, profile in surfist_profiles.items()
            if profile.get("pose_embeddings")
        }

        if not pose_profiles:
            return AgentResult(
                agent_name=self.name,
                surfist_id=None,
                confidence=0.0,
                embedding=embedding,
                error="No pose embeddings in database",
            )

        surfist_id, confidence = self.best_match(
            embedding, pose_profiles, threshold=settings.POSE_SIM_THRESHOLD
        )

        desc = describe_pose_features(self._last_pose_features) if self._last_pose_features is not None else "postura nao detectada"
        self._last_pose_features = None

        return AgentResult(
            agent_name=self.name,
            surfist_id=surfist_id,
            confidence=confidence,
            embedding=embedding,
            description=desc,
            features={
                "feature_dim": len(embedding),
                "knee_angle_norm": round(float(embedding[3]), 3),
                "stance_width_norm": round(float(embedding[5]), 3),
                "shoulder_ratio": round(float(embedding[0]), 3),
            },
        )

    # ── Helpers ───────────────────────────────────────────────────────────────

    def _save_skeleton(self, frame: np.ndarray, video_path: str) -> None:
        try:
            vid_stem = Path(video_path).stem
            out_path = Path(settings.FEATURES_PATH) / f"{vid_stem}_pose.jpg"
            cv2.imwrite(str(out_path), frame)
        except Exception as e:
            logger.warning("[PoseAgent] Could not save skeleton: %s", e)
