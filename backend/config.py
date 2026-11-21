import os
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables
BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR / '.env')
load_dotenv(BASE_DIR.parent / '.env')

class Config:
    SECRET_KEY = os.getenv('SECRET_KEY', 'smart-print-secret-super-key-2026-campus')
    DEBUG = os.getenv('DEBUG', 'True').lower() in ('true', '1', 't')
    PORT = int(os.getenv('PORT', 5000))

    # MySQL Configuration
    DB_HOST = os.getenv('DB_HOST', 'localhost')
    DB_PORT = int(os.getenv('DB_PORT', 3306))
    DB_USER = os.getenv('DB_USER', 'root')
    DB_PASSWORD = os.getenv('DB_PASSWORD', '')
    DB_NAME = os.getenv('DB_NAME', 'smart_printing_db')

    # File uploads
    UPLOAD_FOLDER = os.path.join(BASE_DIR, os.getenv('UPLOAD_FOLDER', 'uploads'))
    MAX_CONTENT_LENGTH = int(os.getenv('MAX_CONTENT_LENGTH', 26214400)) # 25 MB
    ALLOWED_EXTENSIONS = {'pdf'}

    # Queue defaults
    ESTIMATED_MINUTES_PER_PAGE = float(os.getenv('ESTIMATED_MINUTES_PER_PAGE', 0.15))
    BASE_QUEUE_BUFFER_MINUTES = int(os.getenv('BASE_QUEUE_BUFFER_MINUTES', 2))

# Ensure upload directory exists
os.makedirs(Config.UPLOAD_FOLDER, exist_ok=True)
