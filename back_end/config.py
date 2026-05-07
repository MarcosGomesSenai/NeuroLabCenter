import os
from datetime import timedelta
from pathlib import Path

from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parent / ".env")
load_dotenv()


class Config:
    APP_NAME = "NeuroLab Center API"
    API_PREFIX = os.getenv("API_PREFIX", "/api")
    DEBUG = os.getenv("FLASK_DEBUG", "false").lower() == "true"

    MYSQL_HOST = os.getenv("MYSQL_HOST", "localhost")
    MYSQL_PORT = int(os.getenv("MYSQL_PORT", "3306"))
    MYSQL_USER = os.getenv("MYSQL_USER", "root")
    MYSQL_PASSWORD = os.getenv("MYSQL_PASSWORD", "")
    MYSQL_DATABASE = os.getenv("MYSQL_DATABASE", "neurolabcenter")
    MYSQL_POOL_NAME = os.getenv("MYSQL_POOL_NAME", "neurolab_pool")
    MYSQL_POOL_SIZE = int(os.getenv("MYSQL_POOL_SIZE", "5"))

    JWT_SECRET = os.getenv("JWT_SECRET", "troque-esta-chave-em-producao")
    JWT_EXPIRES_IN = timedelta(hours=int(os.getenv("JWT_EXPIRES_HOURS", "8")))

    MINOR_CONFIRMATION_AGE = int(os.getenv("MINOR_CONFIRMATION_AGE", "16"))
    RESPONSIBLE_CONFIRMATION_EXPIRES_HOURS = int(
        os.getenv("RESPONSIBLE_CONFIRMATION_EXPIRES_HOURS", "12")
    )

    CONSULTATION_MIN_HOURS = int(os.getenv("CONSULTATION_MIN_HOURS", "24"))
    TELECONSULTATION_MIN_HOURS = int(os.getenv("TELECONSULTATION_MIN_HOURS", "24"))
    EXAM_MIN_HOURS = int(os.getenv("EXAM_MIN_HOURS", "1"))
    APPOINTMENT_MAX_DAYS_AHEAD = int(os.getenv("APPOINTMENT_MAX_DAYS_AHEAD", "90"))

    RESCHEDULE_LIMIT_30_DAYS = int(os.getenv("RESCHEDULE_LIMIT_30_DAYS", "2"))
    SUS_RESCHEDULE_LIMIT_30_DAYS = int(os.getenv("SUS_RESCHEDULE_LIMIT_30_DAYS", "1"))

    CONSULTATION_CANCEL_MIN_HOURS = int(os.getenv("CONSULTATION_CANCEL_MIN_HOURS", "24"))
    EXAM_CANCEL_MIN_HOURS = int(os.getenv("EXAM_CANCEL_MIN_HOURS", "1"))
