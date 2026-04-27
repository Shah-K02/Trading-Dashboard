"""Shared filesystem path constants."""
from pathlib import Path

# Root of the project (two levels above this file: backend/app/core/ → backend/app/ → backend/ → project root)
PROJECT_ROOT = Path(__file__).resolve().parents[3]

# Directory where journal images are stored
UPLOAD_DIR = PROJECT_ROOT / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)

# Max size for a single uploaded image (10 MB)
MAX_UPLOAD_BYTES = 10 * 1024 * 1024
