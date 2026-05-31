"""
Agent 3 – Surfboard Recognition

Strategy:
  • Uses YOLOv8 (pretrained COCO) to locate the surfboard in each frame.
    COCO class 36 = "surfboard". Falls back to HSV-based white region detection
    if YOLO isn't available.
  • Extracts ORB keypoints + descriptors from the board region.
    ORB captures: edge patterns, wear marks, grip tape texture, sticker shapes.
  • Aggregates descriptors across frames into a "board fingerprint".
  • Matches fingerprints using BFMatcher + ratio test → final match confidence.
  • Saves the best board crop for the review UI.
"""

import asyncio
from pathlib import Path
from typing import Any, Dict, List, Optional

import cv2
import numpy as np
from loguru import logger

from agents.base_agent import AgentResult, BaseAgent
from config import settings

# COCO class index for surfboard
_COCO_SURFBOARD = 36


class BoardAgent(BaseAgent):

    def __init__(self):
        super().__init__(name="BoardAgent", weight=settings.BOARD_WEIGHT)
        self._yolo = None
        self._orb = None
        self._use_yolo = True

    # ── Initialization ────────────────────────────────────────────────────────

    async def initialize(self) -> None:
        def _init_models():
            orb = cv2.ORB_create(nfeatures=500)
            try:
                from ultralytics import YOLO
                yolo = YOLO(settings.YOLO_MODEL_PATH)
                return yolo, orb, True
            except Exception as e:
                logger.warning("[BoardAgent] YOLO load failed (%s) – using HSV fallback", e)
                return None, orb, False

        self._yolo, self._orb, self._use_yolo = await asyncio.to_thread(_init_models)
        logger.info("[BoardAgent] Initialized (YOLO=%s)", self._use_yolo)

    # ── Feature Extraction ────────────────────────────────────────────────────

    async def extract_features(
        self,
        video_path: str,
        frames: List[np.ndarray],
    ) -> Optional[np.ndarray]:
        """
        Returns a compact 256-dim vector aggregated from ORB descriptors,
        or None if no board was found.
        """
        all_descriptors: List[np.ndarray] = []
        best_board_img: Optional[np.ndarray] = None
        best_board_area: int = 0

        for frame in frames:
            result = await asyncio.to_thread(self._process_frame, frame)
            if result is not None:
                descs, board_img, area = result
                all_descriptors.append(descs)
                if area > best_board_area:
                    best_board_area = area
                    best_board_img = board_img

        if not all_descriptors:
            logger.debug("[BoardAgent] No boards detected in %d frames", len(frames))
            return None

        # Save best crop for review UI
        if best_board_img is not None:
            self._save_crop(best_board_img, video_path)

        # Aggregate: pool all descriptors and compute a 256-dim histogram signature
        pooled = np.vstack(all_descriptors)  # (N, 32) uint8
        signature = self._descriptors_to_vector(pooled)
        return signature.astype(np.float32)

    def _process_frame(self, frame: np.ndarray):
        """Detect board, extract ORB descriptors. Returns (descs, crop, area) or None."""
        board_region = self._detect_board(frame)
        if board_region is None:
            return None

        x, y, w, h = board_region
        board_crop = frame[y:y+h, x:x+w]
        if board_crop.size == 0:
            return None

        gray = cv2.cvtColor(board_crop, cv2.COLOR_BGR2GRAY)
        kps, descs = self._orb.detectAndCompute(gray, None)

        if descs is None or len(descs) < 10:
            return None

        return descs, board_crop, w * h

    def _detect_board(self, frame: np.ndarray):
        """Returns (x, y, w, h) bounding box of the largest surfboard, or None."""
        if self._use_yolo and self._yolo is not None:
            return self._detect_with_yolo(frame)
        return self._detect_with_hsv(frame)

    def _detect_with_yolo(self, frame: np.ndarray):
        try:
            results = self._yolo(frame, classes=[_COCO_SURFBOARD], verbose=False)
            best_box = None
            best_area = 0
            for r in results:
                for box in r.boxes:
                    x1, y1, x2, y2 = map(int, box.xyxy[0])
                    area = (x2 - x1) * (y2 - y1)
                    if area > best_area:
                        best_area = area
                        best_box = (x1, y1, x2-x1, y2-y1)
            return best_box
        except Exception as e:
            logger.debug("[BoardAgent] YOLO detect failed: %s", e)
            return self._detect_with_hsv(frame)

    def _detect_with_hsv(self, frame: np.ndarray):
        """
        Fallback: find the largest bright white/light region (typical board color).
        """
        try:
            h_frame, w_frame = frame.shape[:2]
            hsv = cv2.cvtColor(frame, cv2.COLOR_BGR2HSV)
            # White/light board surface
            mask_white = cv2.inRange(hsv, (0, 0, 180), (180, 40, 255))
            # Colorful boards
            mask_color = cv2.inRange(hsv, (0, 60, 100), (180, 255, 255))
            mask = cv2.bitwise_or(mask_white, mask_color)

            kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (9, 9))
            mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, kernel)
            mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, kernel)

            contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            if not contours:
                return None

            # Boards are elongated – filter by aspect ratio
            best = None
            best_area = 0
            for cnt in contours:
                area = cv2.contourArea(cnt)
                if area < 5000:
                    continue
                rx, ry, rw, rh = cv2.boundingRect(cnt)
                aspect = max(rw, rh) / max(min(rw, rh), 1)
                if aspect > 2.0 and area > best_area:  # boards are elongated
                    best_area = area
                    best = (rx, ry, rw, rh)
            return best
        except Exception:
            return None

    # ── Descriptor Aggregation ────────────────────────────────────────────────

    @staticmethod
    def _descriptors_to_vector(descriptors: np.ndarray) -> np.ndarray:
        """
        Aggregate variable-length ORB descriptor matrix → fixed 256-dim vector.
        Method: compute bitwise column statistics (mean bit activation).
        """
        # descriptors: (N, 32) uint8 — unpack bits for each byte
        bits = np.unpackbits(descriptors, axis=1)  # (N, 256)
        return bits.mean(axis=0)                   # (256,) float64

    # ── Database Matching ─────────────────────────────────────────────────────

    async def match_database(
        self,
        embedding: np.ndarray,
        surfist_profiles: Dict[str, Any],
    ) -> AgentResult:
        board_profiles: Dict[str, List[List[float]]] = {
            sid: profile.get("board_features", [])
            for sid, profile in surfist_profiles.items()
            if profile.get("board_features")
        }

        if not board_profiles:
            return AgentResult(
                agent_name=self.name,
                surfist_id=None,
                confidence=0.0,
                embedding=embedding,
                error="No board fingerprints in database",
            )

        surfist_id, confidence = self.best_match(
            embedding, board_profiles, threshold=settings.BOARD_SIM_THRESHOLD
        )

        return AgentResult(
            agent_name=self.name,
            surfist_id=surfist_id,
            confidence=confidence,
            embedding=embedding,
            features={
                "descriptor_dim": len(embedding),
                "method": "YOLOv8+ORB" if self._use_yolo else "HSV+ORB",
            },
        )

    # ── Helpers ───────────────────────────────────────────────────────────────

    def _save_crop(self, crop: np.ndarray, video_path: str) -> None:
        try:
            vid_stem = Path(video_path).stem
            out = Path(settings.FEATURES_PATH) / f"{vid_stem}_board.jpg"
            cv2.imwrite(str(out), crop)
        except Exception as e:
            logger.warning("[BoardAgent] Could not save board crop: %s", e)
