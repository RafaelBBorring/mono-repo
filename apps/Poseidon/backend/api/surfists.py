"""
Surfist API

Endpoints:
  GET  /api/surfists                  List all surfists
  POST /api/surfists                  Create a new surfist
  GET  /api/surfists/{id}             Surfist detail + video stats
  PUT  /api/surfists/{id}             Update name / color
  DELETE /api/surfists/{id}           Deactivate surfist
  POST /api/surfists/{id}/register/image  Add reference image → extract embeddings
  POST /api/surfists/{id}/register/video  Add reference video → extract embeddings
  DELETE /api/surfists/{id}/embeddings    Clear all stored embeddings
"""

import asyncio
import uuid
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from models import Surfist, Video
from agents.face_agent     import FaceAgent
from agents.pose_agent     import PoseAgent
from agents.clothing_agent import ClothingAgent
from agents.board_agent    import BoardAgent
from services.video_processor import video_processor
from config import settings

router = APIRouter()

# Reuse the module-level agent singletons
_face_agent     = FaceAgent()
_pose_agent     = PoseAgent()
_clothing_agent = ClothingAgent()
_board_agent    = BoardAgent()


# ── Schemas ───────────────────────────────────────────────────────────────────

class CreateSurfistRequest(BaseModel):
    name: str
    color_hex: Optional[str] = "#4A90E2"


class UpdateSurfistRequest(BaseModel):
    name: Optional[str] = None
    color_hex: Optional[str] = None
    notes: Optional[str] = None


# ── CRUD ──────────────────────────────────────────────────────────────────────

@router.get("")
async def list_surfists(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Surfist).where(Surfist.is_active == True).order_by(Surfist.display_id)
    )
    surfists = result.scalars().all()
    out = []
    for s in surfists:
        count_result = await db.execute(
            select(func.count()).select_from(Video).where(Video.surfist_id == s.id)
        )
        video_count = count_result.scalar()
        out.append({
            "id":           s.id,
            "name":         s.name,
            "display_id":   s.display_id,
            "folder_name":  s.folder_name,
            "color_hex":    s.color_hex,
            "video_count":  video_count,
            "has_face_emb": len(s.face_embeddings or []) > 0,
            "has_pose_emb": len(s.pose_embeddings or []) > 0,
            "has_clothing_emb":len(s.clothing_embeddings or []) > 0,
            "has_board_emb":len(s.board_features or []) > 0,
            "reference_images": s.reference_images or [],
        })
    return out


@router.post("")
async def create_surfist(
    req: CreateSurfistRequest,
    db: AsyncSession = Depends(get_db),
):
    # Auto-increment display_id
    max_result = await db.execute(select(func.max(Surfist.display_id)))
    max_id = max_result.scalar() or 0

    surfist = Surfist(
        name=req.name,
        display_id=max_id + 1,
        color_hex=req.color_hex,
    )
    db.add(surfist)
    await db.commit()
    await db.refresh(surfist)
    return {
        "id":          surfist.id,
        "name":        surfist.name,
        "display_id":  surfist.display_id,
        "folder_name": surfist.folder_name,
        "color_hex":   surfist.color_hex,
    }


@router.get("/{surfist_id}")
async def get_surfist(surfist_id: str, db: AsyncSession = Depends(get_db)):
    s = await _fetch_surfist(surfist_id, db)

    videos_result = await db.execute(
        select(Video).where(Video.surfist_id == surfist_id)
    )
    videos = videos_result.scalars().all()
    avg_conf = (
        sum(v.final_confidence for v in videos) / len(videos)
        if videos else 0.0
    )

    return {
        "id":           s.id,
        "name":         s.name,
        "display_id":   s.display_id,
        "folder_name":  s.folder_name,
        "color_hex":    s.color_hex,
        "notes":        s.notes,
        "total_videos": len(videos),
        "avg_confidence": round(avg_conf, 4),
        "embedding_counts": {
            "face":  len(s.face_embeddings  or []),
            "pose":  len(s.pose_embeddings  or []),
            "clothing": len(s.clothing_embeddings or []),
            "board": len(s.board_features   or []),
        },
        "reference_images": s.reference_images or [],
    }


@router.put("/{surfist_id}")
async def update_surfist(
    surfist_id: str,
    req: UpdateSurfistRequest,
    db: AsyncSession = Depends(get_db),
):
    s = await _fetch_surfist(surfist_id, db)
    if req.name      is not None: s.name      = req.name
    if req.color_hex is not None: s.color_hex = req.color_hex
    if req.notes     is not None: s.notes     = req.notes
    await db.commit()
    return {"ok": True}


@router.delete("/{surfist_id}")
async def delete_surfist(surfist_id: str, db: AsyncSession = Depends(get_db)):
    s = await _fetch_surfist(surfist_id, db)
    s.is_active = False
    await db.commit()
    return {"ok": True, "deactivated": surfist_id}


# ── Registration: Reference Image ─────────────────────────────────────────────

@router.post("/{surfist_id}/register/image")
async def register_image(
    surfist_id: str,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
):
    """
    Upload a reference photo of a surfist.
    Extracts face + pose embeddings and appends them to the surfist's profile.
    """
    s = await _fetch_surfist(surfist_id, db)

    # Save image
    img_id   = str(uuid.uuid4())
    suffix   = Path(file.filename).suffix.lower() or ".jpg"
    img_path = Path(settings.THUMBNAILS_PATH) / f"ref_{surfist_id}_{img_id}{suffix}"
    content  = await file.read()
    await asyncio.to_thread(img_path.write_bytes, content)

    # Extract face embedding
    import cv2
    import numpy as np
    frame = await asyncio.to_thread(cv2.imread, str(img_path))

    updated: dict = {"face": False, "pose": False}

    if frame is not None:
        # Face
        face_emb = await _face_agent.embed_reference_image(str(img_path))
        if face_emb is not None:
            embs = list(s.face_embeddings or [])
            embs.append(face_emb.tolist())
            s.face_embeddings = embs
            updated["face"] = True

        # Pose (single frame → list of 1)
        pose_emb = await _pose_agent.extract_features("", [frame])
        if pose_emb is not None:
            embs = list(s.pose_embeddings or [])
            embs.append(pose_emb.tolist())
            s.pose_embeddings = embs
            updated["pose"] = True

    # Store reference image path
    refs = list(s.reference_images or [])
    refs.append(str(img_path))
    s.reference_images = refs

    await db.commit()
    return {
        "ok":      True,
        "updated": updated,
        "img_id":  img_id,
    }


# ── Registration: Reference Video ─────────────────────────────────────────────

@router.post("/{surfist_id}/register/video")
async def register_video(
    surfist_id: str,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
):
    """
    Upload a reference video of a surfist.
    Extracts face, pose, clothing AND board embeddings.
    """
    s = await _fetch_surfist(surfist_id, db)

    if not video_processor.validate_extension(file.filename):
        raise HTTPException(400, "Unsupported video format")

    # Save video temporarily
    tmp_id  = str(uuid.uuid4())
    tmp_path = Path(settings.TEMP_PATH) / f"reg_{surfist_id}_{tmp_id}{Path(file.filename).suffix}"
    content  = await file.read()
    await asyncio.to_thread(tmp_path.write_bytes, content)

    try:
        frames = await video_processor.extract_frames(str(tmp_path))
        if not frames:
            raise HTTPException(400, "Could not extract frames from video")

        dummy_profiles: dict = {}  # Empty — we just want the embeddings, not a match

        results = await asyncio.gather(
            _face_agent.extract_features(str(tmp_path), frames),
            _pose_agent.extract_features(str(tmp_path), frames),
            _clothing_agent.extract_features(str(tmp_path), frames),
            _board_agent.extract_features(str(tmp_path), frames),
            return_exceptions=True,
        )
        face_emb, pose_emb, clothing_emb, board_emb = results

        updated = {}

        if isinstance(face_emb, Exception) or face_emb is None:
            updated["face"] = False
        else:
            embs = list(s.face_embeddings or [])
            embs.append(face_emb.tolist())
            s.face_embeddings = embs
            updated["face"] = True

        if isinstance(pose_emb, Exception) or pose_emb is None:
            updated["pose"] = False
        else:
            embs = list(s.pose_embeddings or [])
            embs.append(pose_emb.tolist())
            s.pose_embeddings = embs
            updated["pose"] = True

        if isinstance(clothing_emb, Exception) or clothing_emb is None:
            updated["clothing"] = False
        else:
            embs = list(s.clothing_embeddings or [])
            embs.append(clothing_emb.tolist())
            s.clothing_embeddings = embs
            updated["clothing"] = True

        if isinstance(board_emb, Exception) or board_emb is None:
            updated["board"] = False
        else:
            feats = list(s.board_features or [])
            feats.append(board_emb.tolist())
            s.board_features = feats
            updated["board"] = True

        await db.commit()
        return {"ok": True, "updated": updated, "frames_used": len(frames)}

    finally:
        await asyncio.to_thread(lambda: tmp_path.unlink(missing_ok=True))


# ── Clear Embeddings ───────────────────────────────────────────────────────────

@router.delete("/{surfist_id}/embeddings")
async def clear_embeddings(surfist_id: str, db: AsyncSession = Depends(get_db)):
    s = await _fetch_surfist(surfist_id, db)
    s.face_embeddings     = []
    s.pose_embeddings     = []
    s.clothing_embeddings = []
    s.board_features      = []
    s.reference_images = []
    await db.commit()
    return {"ok": True, "cleared": surfist_id}


# ── Helper ─────────────────────────────────────────────────────────────────────

async def _fetch_surfist(surfist_id: str, db: AsyncSession) -> Surfist:
    result = await db.execute(select(Surfist).where(Surfist.id == surfist_id))
    s = result.scalar_one_or_none()
    if not s:
        raise HTTPException(404, f"Surfist {surfist_id} not found")
    return s
