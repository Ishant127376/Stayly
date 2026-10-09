from urllib.parse import urlsplit

from pydantic import SecretStr, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "Airbnb Marketplace API"
    database_url: str = "sqlite:///./airbnb.db"
    frontend_origin: str = "http://localhost:3000"
    session_ttl_days: int = 7
    session_cookie_secure: bool = False
    smtp_host: str | None = None
    smtp_port: int = 587
    smtp_username: str | None = None
    smtp_password: SecretStr | None = None
    smtp_from_email: str | None = None
    smtp_use_tls: bool = True
    smtp_use_ssl: bool = False
    smtp_timeout_seconds: int = 15
    frontend_base_url: str = "http://localhost:3000"

    @field_validator("frontend_base_url")
    @classmethod
    def require_absolute_frontend_url(cls, value: str) -> str:
        normalized = value.strip()
        parsed = urlsplit(normalized)
        if parsed.scheme not in {"http", "https"} or not parsed.netloc:
            raise ValueError("FRONTEND_BASE_URL must be an absolute HTTP or HTTPS URL.")
        return normalized.rstrip("/")

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()
