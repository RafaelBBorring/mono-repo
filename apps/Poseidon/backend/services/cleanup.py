"""
Cleanup Service

Runs as a background asyncio task.
Every hour, scans the temp directory and removes:
  • Chunk directories older than CLEANUP_HOURS
  • Feature extraction files for videos that no longer exist in DB
"""

import asyncio
import shutil
from datetime import datetime, timedelta
from pathlib import Path

from loguru import logger

from config import settings


async def start_cleanup_scheduler() -> None:
    """
    Runs forever, cleaning up stale temp files every hour.
    Start with: asyncio.create_task(start_cleanup_scheduler())
    """
    logger.info("[Cleanup] Scheduler started (interval=1h, max_age=%dh)", settings.CLEANUP_HOURS)
    while True:
        await asyncio.sleep(3600)  # 1 hour
        await _run_cleanup()


async def _run_cleanup() -> None:
    logger.info("[Cleanup] Running cleanup pass")
    await asyncio.to_thread(_cleanup_temp_dir)
    logger.info("[Cleanup] Pass complete")


def _cleanup_temp_dir() -> None:
    """Remove chunk subdirectories older than CLEANUP_HOURS."""
    temp_root = Path(settings.TEMP_PATH)
    if not temp_root.exists():
        return

    cutoff = datetime.utcnow() - timedelta(hours=settings.CLEANUP_HOURS)
    removed = 0

    for session_dir in temp_root.iterdir():
        if not session_dir.is_dir():
            continue
        mtime = datetime.utcfromtimestamp(session_dir.stat().st_mtime)
        if mtime < cutoff:
            try:
                shutil.rmtree(str(session_dir))
                removed += 1
                logger.debug("[Cleanup] Removed temp dir: %s", session_dir.name)
            except Exception as e:
                logger.warning("[Cleanup] Could not remove %s: %s", session_dir, e)

    if removed:
        logger.info("[Cleanup] Removed %d stale temp directories", removed)
