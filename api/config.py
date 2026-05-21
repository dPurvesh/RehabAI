import os

try:
    from dotenv import load_dotenv
    load_dotenv(override=True)
except Exception:
    pass


def _to_bool(value: str, default: bool = False) -> bool:
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


def _csv_to_list(value: str) -> list[str]:
    if not value:
        return []
    return [item.strip() for item in value.split(",") if item.strip()]


class AppConfig:
    APP_NAME = os.getenv("APP_NAME", "RehabAI")
    ENV = os.getenv("APP_ENV", "development")
    DEBUG = _to_bool(os.getenv("FLASK_DEBUG"), default=False)
    HOST = os.getenv("HOST", "127.0.0.1")
    PORT = int(os.getenv("PORT", "5000"))

    # Comma-separated, for example:
    # http://127.0.0.1:5000,http://localhost:5000,https://app.example.com
    ALLOWED_ORIGINS = _csv_to_list(
        os.getenv(
            "ALLOWED_ORIGINS",
            "http://127.0.0.1:5000,http://localhost:5000",
        )
    )

    GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
    GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")

    SUPABASE_URL = os.getenv("SUPABASE_URL", "")
    SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY", "")
    API_BASE_URL = os.getenv("API_BASE_URL", "")

    RATE_LIMIT_WINDOW_SECONDS = int(os.getenv("RATE_LIMIT_WINDOW_SECONDS", "60"))
    RATE_LIMIT_MAX_REQUESTS = int(os.getenv("RATE_LIMIT_MAX_REQUESTS", "120"))
    MAX_JSON_BODY_BYTES = int(os.getenv("MAX_JSON_BODY_BYTES", "1000000"))
