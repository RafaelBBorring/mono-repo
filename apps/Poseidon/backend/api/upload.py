"""
Upload API

Endpoints:
  POST /api/upload/session              Create an upload session
  POST /api/upload/chunk/{session_id}   Upload one chunk
  POST /api/upload/finalize/{session_id} Assemble chunks & kick off classification
  GET  /api/upload/session/{session_id}/status
  WS   /api/upload/ws/{session_id}      Real-time progress WebSocket
"""

import asyncio
import uuid
from datetime import datetime
from pathlib import Path
from typing import Dict

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, WebSocket, WebSocketDisconnect
from loguru import logger
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from models import ClassificationStatus, UploadSession, Video
from services.video_processor import video_processor
from services.classify_pipeline import classification_pipeline
from config import settings

router = APIRouter()

# In-memory WebSocket registry: {session_id: [WebSocket, ...]}
_ws_clients: Dict[str, list] = {}
_session_locks: Dict[str, asyncio.Lock] = {}


# ── Upload Session ─────────────────────────────────────────────────────────────

@router.post("/session")
async def create_session(db: AsyncSession = Depends(get_db)):
    """Create a new upload session before starting chunked uploads."""
    session = UploadSession()
    db.add(session)
    await db.commit()
    await db.refresh(session)
    return {"session_id": session.id}


# ── Chunk Upload ───────────────────────────────────────────────────────────────

@router.post("/chunk/{session_id}")
async def upload_chunk(
    session_id: str,
    chunk_index: int = Form(...),
    data: UploadFile = File(...),
):
    """Receive one chunk and save it to the temp directory."""
    content = await data.read()
    await video_processor.save_chunk(session_id, chunk_index, content)
    return {"ok": True, "chunk_index": chunk_index, "bytes": len(content)}


# ── Simple (non-chunked) upload ─────────────────────────────────────────────

@router.post("/simple/{session_id}")
async def upload_simple(
    session_id: str,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
):
    """Upload a complete video file in one request (≤ ~100 MB)."""
    if not video_processor.validate_extension(file.filename):
        raise HTTPException(400, f"Unsupported file type: {Path(file.filename).suffix}")

    # Check session
    result = await db.execute(select(UploadSession).where(UploadSession.id == session_id))
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(404, "Session not found")

    # Save file
    video_id   = str(uuid.uuid4())
    filename   = f"{video_id}_{file.filename}"
    file_path  = Path(settings.VIDEOS_PATH) / filename

    content = await file.read()
    size_mb = len(content) / (1024**2)
    if size_mb > settings.MAX_FILE_SIZE_MB:
        raise HTTPException(413, f"File too large ({size_mb:.1f} MB > {settings.MAX_FILE_SIZE_MB} MB)")

    await asyncio.to_thread(lambda: file_path.write_bytes(content))

    if not await video_processor.is_valid_video(str(file_path)):
        await asyncio.to_thread(file_path.unlink)
        raise HTTPException(400, "File does not appear to be a valid video")

    # Extract metadata
    meta = await video_processor.get_metadata(str(file_path))

    # Generate thumbnail
    thumb = await video_processor.generate_thumbnail(str(file_path), video_id)

    # Create Video record
    video = Video(
        id=video_id,
        filename=filename,
        original_filename=file.filename,
        file_path=str(file_path),
        file_size_mb=meta["file_size_mb"],
        duration_seconds=meta["duration_seconds"],
        fps=meta["fps"],
        width=meta["width"],
        height=meta["height"],
        thumbnail_path=thumb,
        upload_session_id=session_id,
    )
    db.add(video)
    session.total_videos += 1
    session.status = "processing"
    await db.commit()
    await db.refresh(video)

    # Kick off classification in background
    asyncio.create_task(_process_video(video.id, session_id))

    return {
        "video_id": video.id,
        "filename": file.filename,
        "size_mb":  meta["file_size_mb"],
        "duration": meta["duration_seconds"],
        "status":   "processing",
    }


# ── Finalize Chunked Upload ─────────────────────────────────────────────────

@router.post("/finalize/{session_id}")
async def finalize_upload(
    session_id: str,
    filename: str = Form(...),
    total_chunks: int = Form(...),
    db: AsyncSession = Depends(get_db),
):
    """Assemble uploaded chunks into a complete video and start classification."""
    result = await db.execute(select(UploadSession).where(UploadSession.id == session_id))
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(404, "Session not found")

    if not video_processor.validate_extension(filename):
        raise HTTPException(400, f"Unsupported file type")

    # Assemble chunks
    try:
        video_path = await video_processor.assemble_chunks(session_id, filename, total_chunks)
    except Exception as e:
        raise HTTPException(500, f"Chunk assembly failed: {e}")

    await video_processor.cleanup_temp(session_id)

    if not await video_processor.is_valid_video(video_path):
        raise HTTPException(400, "Assembled file is not a valid video")

    meta  = await video_processor.get_metadata(video_path)
    video_id = str(uuid.uuid4())
    thumb    = await video_processor.generate_thumbnail(video_path, video_id)

    video = Video(
        id=video_id,
        filename=Path(video_path).name,
        original_filename=filename,
        file_path=video_path,
        file_size_mb=meta["file_size_mb"],
        duration_seconds=meta["duration_seconds"],
        fps=meta["fps"],
        width=meta["width"],
        height=meta["height"],
        thumbnail_path=thumb,
        upload_session_id=session_id,
    )
    db.add(video)
    session.total_videos += 1
    session.status = "processing"
    await db.commit()

    asyncio.create_task(_process_video(video.id, session_id))

    return {"video_id": video.id, "status": "processing"}


# ── Session Status ─────────────────────────────────────────────────────────────

@router.get("/session/{session_id}/status")
async def session_status(session_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(UploadSession).where(UploadSession.id == session_id)
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(404, "Session not found")

    videos = await db.execute(
        select(Video).where(Video.upload_session_id == session_id)
    )
    video_list = videos.scalars().all()
    processed = sum(1 for v in video_list if v.status != ClassificationStatus.PROCESSING)
    status_counts: Dict[str, int] = {}
    for video in video_list:
        key = video.status.value
        status_counts[key] = status_counts.get(key, 0) + 1

    return {
        "session_id":   session_id,
        "total":        session.total_videos,
        "processed":    processed,
        "status":       session.status,
        "status_counts": status_counts,
        "videos": [
            {
                "id":         v.id,
                "filename":   v.original_filename,
                "status":     v.status.value,
                "confidence": v.final_confidence,
                "surfist_id": v.surfist_id,
                "reason":     (v.agent_details or {}).get("reason") if isinstance(v.agent_details, dict) else None,
                "error":      v.error_message,
            }
            for v in video_list
        ],
    }


# ── WebSocket Progress ─────────────────────────────────────────────────────────

@router.websocket("/ws/{session_id}")
async def ws_progress(websocket: WebSocket, session_id: str):
    """WebSocket endpoint for real-time classification progress."""
    await websocket.accept()
    _ws_clients.setdefault(session_id, []).append(websocket)
    try:
        while True:
            await asyncio.sleep(30)  # Keep alive ping
            await websocket.send_json({"type": "ping"})
    except WebSocketDisconnect:
        _ws_clients[session_id].remove(websocket)


async def _broadcast(session_id: str, data: dict) -> None:
    """Send a message to all WebSocket clients watching this session."""
    for ws in list(_ws_clients.get(session_id, [])):
        try:
            await ws.send_json(data)
        except Exception:
            pass


# ── Background Classification Task ────────────────────────────────────────────

async def _process_video(video_id: str, session_id: str) -> None:
    """Background task: run the classification pipeline for one video."""
    from database import async_session_factory

    lock = _session_locks.setdefault(session_id, asyncio.Lock())
    async with lock:
        async with async_session_factory() as db:
            result = await db.execute(select(Video).where(Video.id == video_id))
            video = result.scalar_one_or_none()
            if not video:
                return

            async def _cb(pct: float, msg: str):
                await _broadcast(session_id, {
                    "type":     "progress",
                    "video_id": video_id,
                    "percent":  pct,
                    "message":  msg,
                })

            async def _debug_cb(event: dict):
                await _broadcast(session_id, {
                    **event,
                    "video_id": video_id,
                })

            try:
                await classification_pipeline.run(video, db, progress_cb=_cb, debug_cb=_debug_cb)
                await _broadcast(session_id, {
                    "type":       "done",
                    "video_id":   video_id,
                    "status":     video.status.value,
                    "confidence": video.final_confidence,
                    "surfist_id": video.surfist_id,
                    "reason":     (video.agent_details or {}).get("reason") if isinstance(video.agent_details, dict) else None,
                })
            except Exception as e:
                await _broadcast(session_id, {
                    "type":     "error",
                    "video_id": video_id,
                    "message":  str(e),
                })
            finally:
                await _refresh_session_progress(db, session_id)


async def _refresh_session_progress(db: AsyncSession, session_id: str) -> None:
    session_result = await db.execute(
        select(UploadSession).where(UploadSession.id == session_id)
    )
    session = session_result.scalar_one_or_none()
    if not session:
        return

    videos_result = await db.execute(
        select(Video).where(Video.upload_session_id == session_id)
    )
    videos = videos_result.scalars().all()
    processed = sum(1 for v in videos if v.status != ClassificationStatus.PROCESSING)
    session.processed_videos = processed
    session.status = "done" if videos and processed >= len(videos) else "processing"
    await db.commit()
