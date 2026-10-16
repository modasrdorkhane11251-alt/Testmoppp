from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_env: str = "development"
    app_name: str = "MODASR HUB"
    public_url: str = "http://localhost:3000"
    api_url: str = "http://localhost:8000"
    miniapp_url: str = "http://localhost:3000/tg"

    jwt_secret: str = "dev-secret"
    jwt_ttl_minutes: int = 60
    refresh_ttl_days: int = 30
    encryption_key: str = "0" * 64
    cors_origins: str = "http://localhost:3000"

    database_url: str = "postgresql+asyncpg://modasr:modasr@localhost:5432/modasr"
    redis_url: str = "redis://localhost:6379/0"

    tg_bot_token: str = ""
    tg_bot_username: str = "modasrhub_bot"
    tg_webhook_secret: str = ""
    tg_admin_chat_id: str = ""
    tg_admin_group_id: str = ""
    tg_sales_channel_id: str = ""

    gemini_api_key: str = ""
    gemini_model: str = "gemini-2.5-flash"
    ai_daily_user_limit: int = 60

    zarinpal_merchant_id: str = ""
    zarinpal_sandbox: bool = True

    n8n_webhook_url: str = ""
    n8n_signing_secret: str = ""

    sentry_dsn: str = ""
    internal_token: str = ""

    @property
    def cors_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
