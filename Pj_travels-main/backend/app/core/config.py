import logging

from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

logger = logging.getLogger(__name__)


class Settings(BaseSettings):
    app_name: str = "Agentic Travel Planner"
    app_version: str = "0.1.0"
    app_env: str = "development"
    groq_api_key: str | None = Field(default=None, alias="GROQ_API_KEY")
    groq_model: str = Field(
        default="openai/gpt-oss-120b",
        alias="GROQ_MODEL",
    )
    groq_base_url: str = Field(
        default="https://api.groq.com/openai/v1",
        alias="GROQ_BASE_URL",
    )
    exa_key: str | None = Field(default=None, alias="EXA_KEY")

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        populate_by_name=True,
    )


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    settings = Settings()
    logger.info(
        "Config loaded: model=%s env=%s exa=%s",
        settings.groq_model, settings.app_env,
        "set" if settings.exa_key else "unset",
    )
    return settings
