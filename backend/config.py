import os
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# ============================
# ✅ SECURITY SETTINGS
# ============================

# API Key that frontend must send in header:  x-api-key: YOUR_KEY
API_KEY = os.getenv("MUSIC_API_KEY", "PTG2025")   # Change before production

# Allowed frontend origins for CORS
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "*").split(",")


# ============================
# ✅ PATHS & DIRECTORIES
# ============================

BASE_DIR = Path(__file__).resolve().parent
OUTPUT_ROOT = BASE_DIR / "outputs"
OUTPUT_ROOT.mkdir(parents=True, exist_ok=True)

HISTORY_FILE = OUTPUT_ROOT / "history.json"


# ============================
# ✅ DEFAULT MODEL / DEVICE
# ============================

# Use CPU by default (your system)
DEFAULT_DEVICE = os.getenv("MUSIC_DEVICE", "cpu")

# Default model (MusicGen small)
DEFAULT_MODEL = os.getenv("MUSIC_MODEL", "facebook/musicgen-small")


# ============================
# ✅ UPLOAD LIMITS
# ============================

# Max file upload size = 30 MB
MAX_UPLOAD_SIZE = int(os.getenv("MAX_UPLOAD_SIZE", str(30 * 1024 * 1024)))
