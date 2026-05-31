"""
Surf Classifier – FastAPI Application

Start with:
    uvicorn main:app --host 0.0.0.0 --port 8000 --reload
"""

import asyncio
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from loguru import logger

from api import upload, review, surfists
from config import settings
from database import init_db
from services.cleanup import start_cleanup_scheduler


# ── Lifespan ──────────────────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("🌊  Surf Classifier starting up…")

    # Initialise database
    await init_db()
    logger.info("✅  Database ready")

    # Background cleanup task
    asyncio.create_task(start_cleanup_scheduler())
    logger.info("🧹  Cleanup scheduler started")

    yield

    logger.info("🛑  Surf Classifier shutting down")


# ── App ───────────────────────────────────────────────────────────────────────

app = FastAPI(
    title="Surf Classifier API",
    description="AI-powered surf video classification system with 4-agent ensemble",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# ── CORS ──────────────────────────────────────────────────────────────────────

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS + ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ───────────────────────────────────────────────────────────────────

app.include_router(upload.router,   prefix="/api/upload",   tags=["Upload"])
app.include_router(review.router,   prefix="/api/review",   tags=["Review"])
app.include_router(surfists.router, prefix="/api/surfists", tags=["Surfists"])

# ── Static file serving ───────────────────────────────────────────────────────
# Thumbnails, feature crops, reference images accessible from the frontend

for mount_dir, mount_path in [
    (settings.THUMBNAILS_PATH, "/thumbs"),
    (settings.FEATURES_PATH,   "/features"),
    (settings.VIDEOS_PATH,     "/videos"),
]:
    Path(mount_dir).mkdir(parents=True, exist_ok=True)
    app.mount(mount_path, StaticFiles(directory=mount_dir), name=mount_path.lstrip("/"))


# ── Health ────────────────────────────────────────────────────────────────────

@app.get("/health", tags=["System"])
async def health():
    return {"status": "ok", "version": "1.0.0"}


@app.get("/", tags=["System"])
async def root():
    return {
        "name":    "Surf Classifier API",
        "docs":    "/docs",
        "version": "1.0.0",
    }


# ── Entrypoint ────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host=settings.API_HOST,
        port=settings.API_PORT,
        reload=settings.DEBUG,
        log_level="info",
    )
