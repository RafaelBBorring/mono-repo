from pydantic_settings import BaseSettings
from pathlib import Path
import os


class Settings(BaseSettings):
    STORAGE_PATH: str = "./data"
    TEMP_PATH: str = "./data/temp"
    VIDEOS_PATH: str = "./data/videos"
    THUMBNAILS_PATH: str = "./data/thumbnails"
    EMBEDDINGS_PATH: str = "./data/embeddings"
    FEATURES_PATH: str = "./data/features"
    MODELS_PATH: str = "./models"

    MAX_FILE_SIZE_MB: int = 1024
    CHUNK_SIZE_MB: int = 10
    CLEANUP_HOURS: int = 24
    ALLOWED_EXTENSIONS: list = [".mp4", ".mov", ".avi", ".mkv", ".webm"]

    FACE_MODEL: str = "buffalo_l"
    YOLO_MODEL_PATH: str = "./models/yolov8n.pt"
    YOLO_CONFIDENCE: float = 0.4

    FRAME_SAMPLE_RATE: int = 5
    MAX_FRAMES_FOR_ANALYSIS: int = 120

    AUTO_CLASSIFY_THRESHOLD: float = 0.55
    HUMAN_REVIEW_THRESHOLD: float = 0.20

    BOARD_WEIGHT: float = 0.50
    CLOTHING_WEIGHT: float = 0.20
    POSE_WEIGHT: float = 0.20
    FACE_WEIGHT: float = 0.10

    BOARD_SIM_THRESHOLD: float = 0.55
    CLOTHING_SIM_THRESHOLD: float = 0.60
    POSE_SIM_THRESHOLD: float = 0.65
    FACE_SIM_THRESHOLD: float = 0.55

    OPENROUTER_API_KEY: str = ""
    OPENROUTER_MODEL: str = "google/gemma-4-31b-it:free"
    OPENROUTER_BASE_URL: str = "https://openrouter.ai/api/v1"

    PHASE1_THRESHOLD: float = 0.40
    PHASE2_THRESHOLD: float = 0.60

    DATABASE_URL: str = "sqlite+aiosqlite:///./surf_classifier.db"

    API_HOST: str = "0.0.0.0"
    API_PORT: int = 8000
    DEBUG: bool = True
    CORS_ORIGINS: list = ["http://localhost:5173", "http://localhost:3000"]

    class Config:
        env_file = "../.env"


settings = Settings()

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
