import os
from typing import List
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings configuration."""
    
    # API Configuration
    API_V1_STR: str = "/api/v1"
    PROJECT_NAME: str = "BorgDash"
    VERSION: str = "0.1.0"
    
    # Environment
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "production")
    DEBUG: bool = ENVIRONMENT == "development"
    
    # CORS
    ALLOWED_ORIGINS: List[str] = [
        "http://localhost:3000",  # React dev server
        "http://localhost:5173",  # Vite dev server
        "http://localhost:3157",  # Frontend production port
        "http://192.168.1.100:3157",  # Frontend production on server IP
        "http://frontend:3000",   # Docker frontend service
    ]
    
    # Database
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./borgdash.db")
    
    # Borg Configuration
    BORG_BINARY: str = os.getenv("BORG_BINARY", "borg")
    BORG_REMOTE_PATH: str = os.getenv("BORG_REMOTE_PATH", "borg-1.4")
    
    # SSH Configuration
    # SSH keys should be mounted from host to /app/host_keys/ (see docker-compose)
    # Default SSH key path: /app/host_keys/ssh_key
    
    # Security
    SECRET_KEY: str = os.getenv("SECRET_KEY", "your-secret-key-change-in-production")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))
    
    class Config:
        case_sensitive = True
        env_file = ".env"


# Global settings instance
settings = Settings()