import os
from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    """Application settings loaded from environment variables"""

    # SQLite Database Configuration
    database_path: str = "expenses.db"

    # Server Configuration
    mcp_server_host: str = "0.0.0.0"
    mcp_server_port: int = 3001
    mcp_transport: str = "sse"

    # Environment
    environment: str = "development"

    # Logging
    log_level: str = "INFO"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"  # Ignore extra fields


# Global settings instance
settings = Settings()
