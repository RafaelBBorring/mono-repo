"""
Video Processor Service

Handles:
  • Video metadata extraction (fps, duration, dimensions)
  • Frame sampling at configurable rate
  • Thumbnail generation
  • Temporary file management during chunked uploads
"""

import asyncio
import os
import uuid
from pathlib import Path
from typing import List, Optional, Tuple

import cv2
import numpy as np
from loguru import logger

from config import settings


class VideoProcessor:

    # ── Metadata ──────────────────────────────────────────────────────────────

    @staticmethod
    async def get_metadata(video_path: str) -> dict:
        """
        Extract basic video metadata without reading all frames.
        Returns dict with fps, duration_seconds, width, height, total_frames.
        """
        def _read():
            cap = cv2.VideoCapture(video_path)
            if not cap.isOpened():
                raise ValueError(f"Cannot open video: {video_path}")
            try:
                fps    = cap.get(cv2.CAP_PROP_FPS) or 30.0
                total  = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
                width  = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
                height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
                dur    = total / fps if fps > 0 else 0
                return {
                    "fps": round(fps, 2),
                    "total_frames": total,
                    "duration_seconds": round(dur, 2),
                    "width": width,
                    "height": height,
                    "file_size_mb": round(os.path.getsize(video_path) / (1024**2), 2),
                }
            finally:
                cap.release()

        return await asyncio.to_thread(_read)

    # ── Frame Sampling ────────────────────────────────────────────────────────

    @staticmethod
    async def extract_frames(
        video_path: str,
        sample_rate: int = settings.FRAME_SAMPLE_RATE,
        max_frames: int = settings.MAX_FRAMES_FOR_ANALYSIS,
    ) -> List[np.ndarray]:
        """
        Extract up to `max_frames` BGR frames from the video,
        taking every `sample_rate`-th frame.

        Returns list of np.ndarray (BGR, uint8).
        """
        def _extract():
            cap = cv2.VideoCapture(video_path)
            if not cap.isOpened():
                raise ValueError(f"Cannot open video: {video_path}")
            frames = []
            frame_idx = 0
            try:
                while len(frames) < max_frames:
                    ok, frame = cap.read()
                    if not ok:
                        break
                    if frame_idx % sample_rate == 0:
                        frames.append(frame)
                    frame_idx += 1
            finally:
                cap.release()
            return frames

        frames = await asyncio.to_thread(_extract)
        logger.debug("[VideoProcessor] Extracted %d frames from %s", len(frames), video_path)
        return frames

    # ── Thumbnail ─────────────────────────────────────────────────────────────

    @staticmethod
    async def generate_thumbnail(
        video_path: str,
        video_id: str,
        width: int = 320,
        height: int = 180,
    ) -> Optional[str]:
        """
        Extract frame at ~10% of video and save as JPEG thumbnail.
        Returns path to thumbnail, or None on failure.
        """
        def _gen():
            cap = cv2.VideoCapture(video_path)
            if not cap.isOpened():
                return None
            try:
                total = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
                target_frame = max(0, int(total * 0.10))
                cap.set(cv2.CAP_PROP_POS_FRAMES, target_frame)
                ok, frame = cap.read()
                if not ok:
                    cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
                    ok, frame = cap.read()
                if not ok:
                    return None
                thumb = cv2.resize(frame, (width, height))
                out_path = Path(settings.THUMBNAILS_PATH) / f"{video_id}.jpg"
                cv2.imwrite(str(out_path), thumb, [cv2.IMWRITE_JPEG_QUALITY, 85])
                return str(out_path)
            finally:
                cap.release()

        return await asyncio.to_thread(_gen)

    # ── Chunked Upload Assembly ────────────────────────────────────────────────

    @staticmethod
    async def assemble_chunks(
        session_id: str,
        filename: str,
        total_chunks: int,
    ) -> str:
        """
        Assemble uploaded chunks into a final video file.
        Returns path to the assembled video.
        """
        temp_dir  = Path(settings.TEMP_PATH) / session_id
        final_dir = Path(settings.VIDEOS_PATH)
        final_dir.mkdir(parents=True, exist_ok=True)

        final_path = final_dir / f"{uuid.uuid4()}_{filename}"

        def _assemble():
            with open(final_path, "wb") as out_file:
                for i in range(total_chunks):
                    chunk_path = temp_dir / f"chunk_{i:06d}"
                    if not chunk_path.exists():
                        raise FileNotFoundError(f"Missing chunk {i}")
                    with open(chunk_path, "rb") as chunk_file:
                        out_file.write(chunk_file.read())
            return str(final_path)

        result = await asyncio.to_thread(_assemble)
        logger.info("[VideoProcessor] Assembled %d chunks → %s", total_chunks, result)
        return result

    @staticmethod
    async def save_chunk(
        session_id: str,
        chunk_index: int,
        data: bytes,
    ) -> None:
        """Save one upload chunk to the temp directory."""
        temp_dir = Path(settings.TEMP_PATH) / session_id
        temp_dir.mkdir(parents=True, exist_ok=True)
        chunk_path = temp_dir / f"chunk_{chunk_index:06d}"
        await asyncio.to_thread(lambda: chunk_path.write_bytes(data))

    @staticmethod
    async def cleanup_temp(session_id: str) -> None:
        """Remove temp chunk directory after successful assembly."""
        import shutil
        temp_dir = Path(settings.TEMP_PATH) / session_id
        if temp_dir.exists():
            await asyncio.to_thread(shutil.rmtree, str(temp_dir))

    # ── Validation ─────────────────────────────────────────────────────────────

    @staticmethod
    def validate_extension(filename: str) -> bool:
        suffix = Path(filename).suffix.lower()
        return suffix in settings.ALLOWED_EXTENSIONS

    @staticmethod
    async def is_valid_video(path: str) -> bool:
        """Quick sanity check that the file is a readable video."""
        def _check():
            cap = cv2.VideoCapture(path)
            ok = cap.isOpened()
            cap.release()
            return ok
        return await asyncio.to_thread(_check)


video_processor = VideoProcessor()
