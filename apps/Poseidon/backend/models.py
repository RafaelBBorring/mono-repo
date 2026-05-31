"""
Database ORM models for the Surf Classifier system.

Tables:
    Surfist        – registered surfers with stored AI embeddings
    Video          – uploaded videos with classification results
    UploadSession  – tracks batch uploads
    ProcessingJob  – tracks async classification jobs
"""

import uuid
import enum
from datetime import datetime

from sqlalchemy import (
    Boolean, Column, DateTime, Enum, Float,
    ForeignKey, Integer, JSON, String, Text,
)
from sqlalchemy.orm import relationship

from database import Base


# ── Enums ─────────────────────────────────────────────────────────────────────

class ClassificationStatus(str, enum.Enum):
    PROCESSING      = "processing"
    AUTO_CLASSIFIED = "auto_classified"
    PENDING_REVIEW  = "pending_review"
    UNCLASSIFIED    = "unclassified"
    VERIFIED        = "verified"
    RECLASSIFIED    = "reclassified"


class ReviewStatus(str, enum.Enum):
    PENDING  = "pending"
    REVIEWED = "reviewed"
    SKIPPED  = "skipped"


# ── Models ────────────────────────────────────────────────────────────────────

class Surfist(Base):
    """A registered surfer with AI embedding profiles."""
    __tablename__ = "surfists"

    id         = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name       = Column(String(120), nullable=False)
    display_id = Column(Integer, unique=True, nullable=False)  # "Surfist_3"
    color_hex  = Column(String(7), default="#4A90E2")          # UI badge color
    notes      = Column(Text, default="")
    created_at = Column(DateTime, default=datetime.utcnow)
    is_active  = Column(Boolean, default=True)

    # ── Embeddings stored as JSON-serialised Python lists ─────────────────────
    # Each entry is one observation; we average at inference time.
    face_embeddings  = Column(JSON, default=list)  # List[List[float]] 512-dim
    pose_embeddings  = Column(JSON, default=list)  # List[List[float]] pose features
    clothing_embeddings = Column(JSON, default=list)  # List[List[float]] clothing color+texture vectors
    board_features   = Column(JSON, default=list)  # List[dict]  ORB descriptor data

    # Reference thumbnails (paths relative to STORAGE_PATH)
    reference_images = Column(JSON, default=list)

    videos = relationship("Video", back_populates="surfist")

    @property
    def folder_name(self) -> str:
        return f"Surfist_{self.display_id}"


class Video(Base):
    """An uploaded surf video with full classification metadata."""
    __tablename__ = "videos"

    id                = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    filename          = Column(String, nullable=False)
    original_filename = Column(String, nullable=False)
    file_path         = Column(String, nullable=False)
    file_size_mb      = Column(Float)
    duration_seconds  = Column(Float)
    fps               = Column(Float)
    width             = Column(Integer)
    height            = Column(Integer)
    thumbnail_path    = Column(String)

    upload_session_id = Column(String, ForeignKey("upload_sessions.id"), nullable=False)
    uploaded_at       = Column(DateTime, default=datetime.utcnow)
    processed_at      = Column(DateTime)

    # ── Classification state ──────────────────────────────────────────────────
    status        = Column(Enum(ClassificationStatus), default=ClassificationStatus.PROCESSING)
    review_status = Column(Enum(ReviewStatus),         default=ReviewStatus.PENDING)

    # Final assignment
    surfist_id = Column(String, ForeignKey("surfists.id"), nullable=True)
    surfist    = relationship("Surfist", back_populates="videos")

    # ── Per-agent results ─────────────────────────────────────────────────────
    face_confidence   = Column(Float, default=0.0)
    pose_confidence   = Column(Float, default=0.0)
    board_confidence  = Column(Float, default=0.0)
    clothing_confidence  = Column(Float, default=0.0)
    final_confidence  = Column(Float, default=0.0)

    face_surfist_id   = Column(String, nullable=True)
    pose_surfist_id   = Column(String, nullable=True)
    board_surfist_id  = Column(String, nullable=True)
    clothing_surfist_id  = Column(String, nullable=True)

    # Full agent detail payloads (JSON) for review UI
    agent_details = Column(JSON, default=dict)

    # Paths to extracted visual evidence for review
    face_crop_path    = Column(String)
    pose_sketch_path  = Column(String)
    board_crop_path   = Column(String)

    error_message = Column(Text)
    notes         = Column(Text, default="")


class UploadSession(Base):
    """Groups videos uploaded together in one batch."""
    __tablename__ = "upload_sessions"

    id               = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    created_at       = Column(DateTime, default=datetime.utcnow)
    total_videos     = Column(Integer, default=0)
    processed_videos = Column(Integer, default=0)
    status           = Column(String, default="uploading")  # uploading | processing | done

    videos = relationship("Video", foreign_keys="Video.upload_session_id")


class ProcessingJob(Base):
    """Async job tracking for each video's classification pipeline."""
    __tablename__ = "processing_jobs"

    id           = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    video_id     = Column(String, ForeignKey("videos.id"), nullable=False)
    created_at   = Column(DateTime, default=datetime.utcnow)
    started_at   = Column(DateTime)
    completed_at = Column(DateTime)
    status       = Column(String, default="queued")  # queued | running | done | failed
    progress     = Column(Float, default=0.0)        # 0–100
    current_step = Column(String)
    error        = Column(Text)

    video = relationship("Video")
