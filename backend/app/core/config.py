from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # App
    app_name: str = "ShengKe API"
    app_version: str = "0.1.0"
    debug: bool = False

    # Database
    database_url: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/shengke"
    database_sync_url: str = "postgresql://postgres:postgres@localhost:5432/shengke"

    # Redis
    redis_url: str = "redis://localhost:6379/0"

    # JWT
    jwt_secret: str = "CHANGE-ME-in-production"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 15
    refresh_token_expire_days: int = 7

    # Ali OSS
    ali_oss_endpoint: str = ""
    ali_oss_bucket: str = ""
    ali_oss_access_key_id: str = ""
    ali_oss_access_key_secret: str = ""

    # Ali LLM (通义千问)
    ali_llm_api_key: str = ""
    ali_llm_base_url: str = "https://dashscope.aliyuncs.com/compatible-mode/v1"
    ali_llm_model: str = "qwen-turbo"

    # CORS
    cors_origins: list[str] = ["*"]

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


@lru_cache()
def get_settings() -> Settings:
    return Settings()
