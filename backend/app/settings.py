from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    database_url: str = "postgresql+asyncpg://joyplot:joyplot@db:5432/joyplot"
    admin_secret: str
    token_pepper: str
    config_dir: Path = Path(__file__).resolve().parents[2] / "config"
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

