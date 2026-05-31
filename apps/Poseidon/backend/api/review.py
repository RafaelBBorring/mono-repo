"""
Review API

Level 1 – Folder / Surfist-level operations:
  GET  /api/review/folders            All surfist folders with stats
  GET  /api/review/folders/similarity Pairwise surfist similarity matrix
  POST /api/review/folders/merge      Merge two surfist folders
  POST /api/review/folders/{id}/verify Mark entire folder as verified

Level 2 – Per-video operations:
  GET  /api/review/queue              Paginated pending-review video list
  POST /api/review/video/{id}/confirm Confirm current classification
  POST /api/review/video/{id}/reject  Move to Unclassified
  POST /api/review/video/{id}/assign  Assign to a specific surfist
  POST /api/review/video/{id}/skip    Skip for later review
  GET  /api/review/progress           Overall review completion stats
"""

from pathlib import Path
from typing import List, Literal, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import delete, func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from fusion.decision_engine import decision_engine
from models import ClassificationStatus, ProcessingJob, ReviewStatus, Surfist, Video
from config import settings

router = APIRouter()


# ── Schemas ───────────────────────────────────────────────────────────────────

class AssignRequest(BaseModel):
    surfist_id: str

class MergeRequest(BaseModel):
    source_surfist_id: str      # Videos from this surfist …
    target_surfist_id: str      # … move to this one


# ── Level 1: Folder / Surfist Dashboard ──────────────────────────────────────

class MoveVideoRequest(BaseModel):
    target: Literal["surfist", "unclassified", "review"]
    surfist_id: Optional[str] = None


@router.get("/folders")
async def get_folders(db: AsyncSession = Depends(get_db)):
    """Return all surfist folders with aggregate statistics."""
    result = await db.execute(select(Surfist).where(Surfist.is_active == True))
    surfists = result.scalars().all()

    folders = []
    for s in surfists:
        vids_result = await db.execute(
            select(Video).where(Video.surfist_id == s.id)
        )
        videos = vids_result.scalars().all()

        total       = len(videos)
        avg_conf    = sum(v.final_confidence for v in videos) / total if total else 0
        verified    = sum(1 for v in videos if v.review_status == ReviewStatus.REVIEWED)
        pending_rev = sum(1 for v in videos if v.review_status == ReviewStatus.PENDING
                          and v.status == ClassificationStatus.PENDING_REVIEW)

        # Sample thumbnail paths
        sample_thumbs = [
            _media_url(v.thumbnail_path, "/thumbs") for v in videos[:4] if v.thumbnail_path
        ]
        reference_image = None
        for ref in s.reference_images or []:
            reference_image = _media_url(ref, "/thumbs")
            if reference_image:
                break

        folders.append({
            "surfist_id":      s.id,
            "display_id":      s.display_id,
            "name":            s.name,
            "folder_name":     s.folder_name,
            "color_hex":       s.color_hex,
            "total_videos":    total,
            "avg_confidence":  round(avg_conf, 4),
            "verified_count":  verified,
            "pending_review":  pending_rev,
            "sample_thumbs":   sample_thumbs,
            "reference_image":  reference_image or (sample_thumbs[0] if sample_thumbs else None),
        })

    # Add synthetic folders for human review queue and unclassified
    review_count = await _count_status(db, ClassificationStatus.PENDING_REVIEW)
    unclass_count = await _count_status(db, ClassificationStatus.UNCLASSIFIED)

    return {
        "surfist_folders": folders,
        "human_review_queue": review_count,
        "unclassified":       unclass_count,
    }


@router.get("/folders/{surfist_id}/videos")
async def get_folder_videos(surfist_id: str, db: AsyncSession = Depends(get_db)):
    """Videos assigned to one surfist folder."""
    surfist = await _fetch_surfist(surfist_id, db)
    videos_result = await db.execute(
        select(Video)
        .where(Video.surfist_id == surfist_id)
        .order_by(Video.uploaded_at.desc())
    )
    videos = videos_result.scalars().all()
    return {
        "folder": {
            "id": surfist.id,
            "name": surfist.name,
            "display_id": surfist.display_id,
            "folder_name": surfist.folder_name,
            "color_hex": surfist.color_hex,
            "reference_image": _media_url((surfist.reference_images or [None])[0], "/thumbs"),
        },
        "videos": [_video_summary(v) for v in videos],
        "all_surfists": await _all_surfists(db),
    }


@router.get("/unclassified/videos")
async def get_unclassified_videos(db: AsyncSession = Depends(get_db)):
    """Videos in the synthetic human-reviewable Unclassified folder."""
    videos_result = await db.execute(
        select(Video)
        .where(Video.status == ClassificationStatus.UNCLASSIFIED)
        .order_by(Video.uploaded_at.desc())
    )
    videos = videos_result.scalars().all()
    return {
        "folder": {
            "id": "unclassified",
            "name": "NÃO CLASSIFICADO",
            "folder_name": "Não classificados",
            "color_hex": "#F43F5E",
            "reference_image": None,
        },
        "videos": [_video_summary(v) for v in videos],
        "all_surfists": await _all_surfists(db),
    }


@router.get("/folders/similarity")
async def get_similarity_matrix(db: AsyncSession = Depends(get_db)):
    """Pairwise face-embedding similarity between all surfists."""
    result = await db.execute(select(Surfist).where(Surfist.is_active == True))
    surfists = result.scalars().all()
    profiles = {
        s.id: {"face_embeddings": s.face_embeddings or []}
        for s in surfists
    }
    matrix = decision_engine.compute_inter_surfist_similarity(profiles)
    names  = {s.id: s.name for s in surfists}
    return {"matrix": matrix, "names": names}


@router.post("/folders/{surfist_id}/verify")
async def verify_folder(surfist_id: str, db: AsyncSession = Depends(get_db)):
    """Mark all videos in a surfist folder as reviewed."""
    await db.execute(
        update(Video)
        .where(Video.surfist_id == surfist_id)
        .values(review_status=ReviewStatus.REVIEWED)
    )
    await db.commit()
    return {"ok": True, "surfist_id": surfist_id}


@router.post("/folders/merge")
async def merge_folders(req: MergeRequest, db: AsyncSession = Depends(get_db)):
    """Move all videos from source surfist to target surfist."""
    # Verify both exist
    for sid in [req.source_surfist_id, req.target_surfist_id]:
        r = await db.execute(select(Surfist).where(Surfist.id == sid))
        if not r.scalar_one_or_none():
            raise HTTPException(404, f"Surfist {sid} not found")

    await db.execute(
        update(Video)
        .where(Video.surfist_id == req.source_surfist_id)
        .values(surfist_id=req.target_surfist_id,
                status=ClassificationStatus.RECLASSIFIED)
    )

    # Deactivate source (soft delete)
    await db.execute(
        update(Surfist)
        .where(Surfist.id == req.source_surfist_id)
        .values(is_active=False)
    )
    await db.commit()
    return {"ok": True, "merged_to": req.target_surfist_id}


# ── Level 2: Per-Video Review Queue ──────────────────────────────────────────

@router.get("/queue")
async def get_review_queue(
    page:   int = Query(1, ge=1),
    size:   int = Query(20, ge=1, le=100),
    status: str = Query("pending_review"),
    db: AsyncSession = Depends(get_db),
):
    """Paginated list of videos awaiting human review."""
    status_enum = ClassificationStatus(status)
    offset = (page - 1) * size

    count_result = await db.execute(
        select(func.count()).select_from(Video).where(
            Video.status == status_enum,
            Video.review_status == ReviewStatus.PENDING,
        )
    )
    total = count_result.scalar()

    videos_result = await db.execute(
        select(Video)
        .where(Video.status == status_enum, Video.review_status == ReviewStatus.PENDING)
        .order_by(Video.final_confidence.desc())
        .limit(size).offset(offset)
    )
    videos = videos_result.scalars().all()

    return {
        "total": total,
        "page":  page,
        "pages": (total + size - 1) // size,
        "items": [_video_summary(v) for v in videos],
    }


@router.get("/video/{video_id}")
async def get_video_detail(video_id: str, db: AsyncSession = Depends(get_db)):
    """Full detail for one video including all agent results."""
    v = await _get_video(video_id, db)

    # Load surfist info
    surfist_info = None
    if v.surfist_id:
        r = await db.execute(select(Surfist).where(Surfist.id == v.surfist_id))
        s = r.scalar_one_or_none()
        if s:
            surfist_info = {
                "id": s.id, "name": s.name,
                "display_id": s.display_id, "folder": s.folder_name,
                "reference_images": s.reference_images or [],
            }

    # Load all surfists for the reassign dropdown
    return {
        **_video_summary(v),
        "agent_details":    v.agent_details or {},
        "face_crop_path":   v.face_crop_path,
        "pose_sketch_path": v.pose_sketch_path,
        "board_crop_path":  v.board_crop_path,
        "face_crop_url":    _media_url(v.face_crop_path, "/features"),
        "pose_sketch_url":  _media_url(v.pose_sketch_path, "/features"),
        "board_crop_url":   _media_url(v.board_crop_path, "/features"),
        "surfist":          surfist_info,
        "all_surfists":     await _all_surfists(db),
        "notes":            v.notes,
    }


@router.post("/video/{video_id}/confirm")
async def confirm_video(video_id: str, db: AsyncSession = Depends(get_db)):
    """Confirm the current AI classification for a video."""
    v = await _get_video(video_id, db)
    v.review_status = ReviewStatus.REVIEWED
    v.status        = ClassificationStatus.VERIFIED
    await db.commit()
    return {"ok": True, "video_id": video_id, "action": "confirmed"}


@router.post("/video/{video_id}/reject")
async def reject_video(video_id: str, db: AsyncSession = Depends(get_db)):
    """Move video to Unclassified."""
    v = await _get_video(video_id, db)
    v.surfist_id    = None
    v.status        = ClassificationStatus.UNCLASSIFIED
    v.review_status = ReviewStatus.REVIEWED
    await db.commit()
    return {"ok": True, "video_id": video_id, "action": "unclassified"}


@router.post("/video/{video_id}/assign")
async def assign_video(
    video_id: str,
    req: AssignRequest,
    db: AsyncSession = Depends(get_db),
):
    """Assign video to a specific surfist (human override)."""
    v = await _get_video(video_id, db)
    # Verify surfist exists
    r = await db.execute(select(Surfist).where(Surfist.id == req.surfist_id))
    if not r.scalar_one_or_none():
        raise HTTPException(404, f"Surfist {req.surfist_id} not found")

    v.surfist_id    = req.surfist_id
    v.status        = ClassificationStatus.RECLASSIFIED
    v.review_status = ReviewStatus.REVIEWED
    await db.commit()
    return {"ok": True, "video_id": video_id, "assigned_to": req.surfist_id}


@router.post("/video/{video_id}/skip")
async def skip_video(video_id: str, db: AsyncSession = Depends(get_db)):
    """Mark video as skipped for later review."""
    v = await _get_video(video_id, db)
    v.review_status = ReviewStatus.SKIPPED
    await db.commit()
    return {"ok": True, "video_id": video_id, "action": "skipped"}


@router.post("/video/{video_id}/move")
async def move_video(
    video_id: str,
    req: MoveVideoRequest,
    db: AsyncSession = Depends(get_db),
):
    """Move a video between surfist folders, Review, and Unclassified."""
    v = await _get_video(video_id, db)

    if req.target == "surfist":
        if not req.surfist_id:
            raise HTTPException(400, "surfist_id is required when target='surfist'")
        surfist = await _fetch_surfist(req.surfist_id, db)
        v.surfist_id = surfist.id
        v.status = ClassificationStatus.RECLASSIFIED
        v.review_status = ReviewStatus.REVIEWED
        action = f"moved_to_{surfist.folder_name}"
    elif req.target == "unclassified":
        v.surfist_id = None
        v.status = ClassificationStatus.UNCLASSIFIED
        v.review_status = ReviewStatus.PENDING
        action = "moved_to_unclassified"
    else:
        v.status = ClassificationStatus.PENDING_REVIEW
        v.review_status = ReviewStatus.PENDING
        action = "moved_to_review"

    details = v.agent_details if isinstance(v.agent_details, dict) else {}
    details["last_human_action"] = action
    v.agent_details = details
    await db.commit()
    return {"ok": True, "video_id": video_id, "action": action}


@router.delete("/video/{video_id}")
async def delete_video(video_id: str, db: AsyncSession = Depends(get_db)):
    """Delete a video record and its stored media/evidence files."""
    v = await _get_video(video_id, db)
    paths = [
        v.file_path,
        v.thumbnail_path,
        v.face_crop_path,
        v.pose_sketch_path,
        v.board_crop_path,
    ]
    await db.execute(delete(ProcessingJob).where(ProcessingJob.video_id == video_id))
    await db.delete(v)
    await db.commit()
    deleted_files = [_safe_unlink(path) for path in paths if path]
    return {
        "ok": True,
        "video_id": video_id,
        "deleted_files": sum(1 for ok in deleted_files if ok),
    }


@router.patch("/video/{video_id}/notes")
async def update_notes(
    video_id: str,
    notes: str,
    db: AsyncSession = Depends(get_db),
):
    v = await _get_video(video_id, db)
    v.notes = notes
    await db.commit()
    return {"ok": True}


# ── Progress Stats ─────────────────────────────────────────────────────────────

@router.get("/progress")
async def review_progress(db: AsyncSession = Depends(get_db)):
    """Overall review completion statistics."""
    total_result = await db.execute(select(func.count()).select_from(Video))
    total = total_result.scalar()

    reviewed = await _count_review_status(db, ReviewStatus.REVIEWED)
    pending  = await _count_status(db, ClassificationStatus.PENDING_REVIEW)
    auto     = await _count_status(db, ClassificationStatus.AUTO_CLASSIFIED)
    unclass  = await _count_status(db, ClassificationStatus.UNCLASSIFIED)

    return {
        "total_videos":          total,
        "auto_classified":       auto,
        "pending_review":        pending,
        "unclassified":          unclass,
        "human_reviewed":        reviewed,
        "review_completion_pct": round(reviewed / total * 100, 1) if total else 0,
    }


# ── Helpers ───────────────────────────────────────────────────────────────────

def _video_summary(v: Video) -> dict:
    storage_filename = Path(v.file_path).name if v.file_path else None
    return {
        "id":               v.id,
        "filename":         v.original_filename,
        "storage_filename": storage_filename,
        "video_url":        f"/videos/{storage_filename}" if storage_filename else None,
        "thumbnail":        v.thumbnail_path,
        "thumbnail_url":    _media_url(v.thumbnail_path, "/thumbs"),
        "duration":         v.duration_seconds,
        "status":           v.status.value,
        "review_status":    v.review_status.value,
        "surfist_id":       v.surfist_id,
        "final_confidence": v.final_confidence,
        "face_confidence":  v.face_confidence,
        "pose_confidence":  v.pose_confidence,
        "board_confidence": v.board_confidence,
        "clothing_confidence": v.clothing_confidence,
        "uploaded_at":      v.uploaded_at.isoformat() if v.uploaded_at else None,
        "processed_at":     v.processed_at.isoformat() if v.processed_at else None,
        "decision_reason":  _decision_reason(v),
        "error_message":    v.error_message,
    }


def _decision_reason(v: Video) -> Optional[str]:
    details = v.agent_details if isinstance(v.agent_details, dict) else {}
    if details.get("reason"):
        return details["reason"]
    if v.error_message:
        return v.error_message
    if v.status == ClassificationStatus.UNCLASSIFIED:
        return "Não classificado: a IA não encontrou sinal suficiente para enviar a uma pasta."
    if v.status == ClassificationStatus.PENDING_REVIEW:
        return "Revisão humana necessária: a IA encontrou conflito ou confiança intermediária."
    return None


def _media_url(path: Optional[str], mount: str) -> Optional[str]:
    if not path:
        return None
    return f"{mount}/{Path(path).name}"


async def _all_surfists(db: AsyncSession) -> List[dict]:
    result = await db.execute(
        select(Surfist).where(Surfist.is_active == True).order_by(Surfist.display_id)
    )
    return [
        {
            "id": s.id,
            "name": s.name,
            "display_id": s.display_id,
            "folder_name": s.folder_name,
            "color_hex": s.color_hex,
        }
        for s in result.scalars().all()
    ]


def _safe_unlink(path: Optional[str]) -> bool:
    if not path:
        return False
    try:
        file_path = Path(path).resolve()
        storage_root = Path(settings.STORAGE_PATH).resolve()
        if storage_root not in file_path.parents and file_path != storage_root:
            return False
        if file_path.exists() and file_path.is_file():
            file_path.unlink()
            return True
    except Exception:
        return False
    return False


async def _get_video(video_id: str, db: AsyncSession) -> Video:
    result = await db.execute(select(Video).where(Video.id == video_id))
    v = result.scalar_one_or_none()
    if not v:
        raise HTTPException(404, f"Video {video_id} not found")
    return v


async def _count_status(db: AsyncSession, status: ClassificationStatus) -> int:
    r = await db.execute(
        select(func.count()).select_from(Video).where(Video.status == status)
    )
    return r.scalar()


async def _count_review_status(db: AsyncSession, status: ReviewStatus) -> int:
    r = await db.execute(
        select(func.count()).select_from(Video).where(Video.review_status == status)
    )
    return r.scalar()
