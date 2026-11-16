from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application configuration loaded from environment variables or .env."""

    app_name: str = "Antigravity Command Center"
    database_url: str = "sqlite:///./command_center.db"
    worktrees_dir: str = "./.worktrees"
    cors_origins: str = "http://localhost:3000"
    github_token: str = ""
    anthropic_api_key: str = ""
    gemini_api_key: str = ""

    # Phase 2: Google Calendar OAuth
    google_client_id: str = ""
    google_client_secret: str = ""
    google_calendar_token: str = ""

    # Phase 3: Multichannel connectors
    whatsapp_webhook_url: str = ""
    zendesk_subdomain: str = ""
    zendesk_email: str = ""
    zendesk_api_token: str = ""

    # Phase 4: YouTube / Instagram
    youtube_api_key: str = ""
    instagram_access_token: str = ""

    # Onda 1 & 2: Auth & Daily Digest
    admin_password: str = ""
    jwt_secret: str = "change-me-in-production"
    smtp_host: str = ""
    smtp_port: int = 587
    smtp_user: str = ""
    smtp_password: str = ""
    digest_email_to: str = ""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @property
    def worktrees_path(self) -> Path:
        path = Path(self.worktrees_dir).resolve()
        path.mkdir(parents=True, exist_ok=True)
        return path


settings = Settings()
