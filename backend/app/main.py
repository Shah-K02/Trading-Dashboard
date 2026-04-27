from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import logging

from app.api.router import api_router
from app.core.config import settings
from app.core.paths import UPLOAD_DIR

logging.basicConfig(
    level=logging.DEBUG if settings.app_debug else logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)

app = FastAPI(
    title=settings.app_name,
    debug=settings.app_debug,
    version="1.0.0",
    # Hide docs in production
    docs_url="/docs" if settings.app_debug else None,
    redoc_url="/redoc" if settings.app_debug else None,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/uploads", StaticFiles(directory=str(UPLOAD_DIR)), name="uploads")


@app.get("/health", tags=["health"])
def health() -> dict:
    return {"status": "ok", "version": "1.0.0"}


app.include_router(api_router, prefix="/api")

logger.info("TradeLens API started (env=%s, debug=%s)", settings.app_env, settings.app_debug)
