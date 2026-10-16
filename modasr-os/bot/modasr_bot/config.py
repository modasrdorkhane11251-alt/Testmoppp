from pydantic_settings import BaseSettings, SettingsConfigDict


class BotSettings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")
    tg_bot_token: str
    tg_webhook_secret: str
    api_url: str = "http://api:8000"
    public_url: str = "https://modasrhub.com"
    miniapp_url: str = "https://modasrhub.com/tg"
    internal_token: str
    webhook_base: str = "https://bot.modasrhub.com"
    tg_admin_chat_id: str = ""


settings = BotSettings()
