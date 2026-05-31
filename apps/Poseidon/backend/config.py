from pydantic_settings import BaseSettings
from pathlib import Path
import os


class Settings(BaseSettings):
    # ── Storage Paths ────────────────────────────────────────────────────────
    STORAGE_PATH: str = "./data"
    TEMP_PATH: str = "./data/temp"
    VIDEOS_PATH: str = "./data/videos"
    THUMBNAILS_PATH: str = "./data/thumbnails"
    EMBEDDINGS_PATH: str = "./data/embeddings"
    FEATURES_PATH: str = "./data/features"
    MODELS_PATH: str = "./models"

    # ── Upload Limits ─────────────────────────────────────────────────────────
    MAX_FILE_SIZE_MB: int = 1024          # 1 GB per file
    CHUNK_SIZE_MB: int = 10               # 10 MB per upload chunk
    CLEANUP_HOURS: int = 24               # Auto-delete temp files after 24h
    ALLOWED_EXTENSIONS: list = [".mp4", ".mov", ".avi", ".mkv", ".webm"]

    # ── AI Model Settings ─────────────────────────────────────────────────────
    FACE_MODEL: str = "buffalo_l"           # InsightFace model pack
    YOLO_MODEL_PATH: str = "./models/yolov8n.pt"
    YOLO_CONFIDENCE: float = 0.4

    # ── Frame Extraction ──────────────────────────────────────────────────────
    FRAME_SAMPLE_RATE: int = 5            # Analyze every Nth frame
    MAX_FRAMES_FOR_ANALYSIS: int = 120    # Cap frames per video

    # ── Classification Thresholds ─────────────────────────────────────────────
    AUTO_CLASSIFY_THRESHOLD: float = 0.55   # ≥55% → auto-classify
    HUMAN_REVIEW_THRESHOLD: float = 0.20    # 20-54% → human review
    # <20% → Unclassified

    # ── Agent Weights (must sum to 1.0) ───────────────────────────────────────
    # BOARD-FIRST: board scratches/wear are most reliable surfer identifier
    BOARD_WEIGHT: float = 0.50
    CLOTHING_WEIGHT: float = 0.20
    POSE_WEIGHT: float = 0.20
    FACE_WEIGHT: float = 0.10

    # ── Per-Agent Similarity Thresholds ──────────────────────────────────────
    BOARD_SIM_THRESHOLD: float = 0.55
    CLOTHING_SIM_THRESHOLD: float = 0.60
    POSE_SIM_THRESHOLD: float = 0.65
    FACE_SIM_THRESHOLD: float = 0.55

    # ── Database ──────────────────────────────────────────────────────────────
    DATABASE_URL: str = "sqlite+aiosqlite:///./surf_classifier.db"

    # ── API Server ────────────────────────────────────────────────────────────
    API_HOST: str = "0.0.0.0"
    API_PORT: int = 8000
    DEBUG: bool = True
    CORS_ORIGINS: list = ["http://localhost:5173", "http://localhost:3000"]

    class Config:
        env_file = ".env"


settings = Settings()

# Create all required directories on startup
for _path in [
    settings.STORAGE_PATH,
    settings.TEMP_PATH,
    settings.VIDEOS_PATH,
    settings.THUMBNAILS_PATH,
    settings.EMBEDDINGS_PATH,
    settings.FEATURES_PATH,
    settings.MODELS_PATH,
]:
    Path(_path).mkdir(parents=True, exist_ok=True)
