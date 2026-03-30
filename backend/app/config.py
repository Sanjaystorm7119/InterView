from pathlib import Path
from pydantic_settings import BaseSettings
from pydantic import field_validator
from functools import lru_cache

_ENV_FILE = str(Path(__file__).resolve().parents[2] / ".env")


class Settings(BaseSettings):
    # Database
    DATABASE_URL: str = "postgresql://postgres:12345@localhost/Hire"

    # JWT
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    @field_validator("SECRET_KEY")
    @classmethod
    def secret_key_must_be_strong(cls, v: str) -> str:
        weak = {"your-secret-key-change-in-production", "change-this-to-a-random-secret-key-in-production", ""}
        if v in weak:
            raise ValueError("SECRET_KEY must be set to a strong random value in .env")
        return v

    # OpenRouter (AI)
    OPENROUTER_API_KEY: str = ""

    # Vapi
    VAPI_API_KEY: str = ""

    # Resend (Email)
    RESEND_API_KEY: str = ""
    RESEND_FROM_EMAIL: str = "onboarding@resend.dev"

    # Stripe
    STRIPE_SECRET_KEY: str = ""
    STRIPE_WEBHOOK_SECRET: str = ""

    # Sentry
    SENTRY_DSN: str = ""

    # Frontend URL
    FRONTEND_URL: str = "http://localhost:3000"
    HOST_URL: str = "http://localhost:3000/interview"

    # AI Models
    GEMINI_FLASH_LITE: str = "google/gemini-2.5-flash-lite"
    GEMINI_FLASH_25: str = "google/gemini-2.5-flash"
    GEMMA_3N: str = "google/gemma-3n-e2b-it:free"

    model_config = {"env_file": _ENV_FILE, "extra": "ignore"}


@lru_cache
def get_settings() -> Settings:
    return Settings()
