from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import uvicorn
import os
from contextlib import asynccontextmanager

from .api import repositories, archives, stats
from .database import init_db
from .config import settings


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize database and cleanup on startup/shutdown."""
    # Startup
    await init_db()
    yield
    # Shutdown
    pass


app = FastAPI(
    title="BorgDash API",
    description="A modern web UI for Borg Backup management",
    version="0.1.0",
    lifespan=lifespan
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routers
app.include_router(repositories.router, prefix="/api/repositories", tags=["repositories"])
app.include_router(archives.router, prefix="/api/archives", tags=["archives"])
app.include_router(stats.router, prefix="/api/stats", tags=["statistics"])


@app.get("/")
async def root():
    """Health check endpoint."""
    return {"message": "BorgDash API is running", "version": "0.1.0"}


@app.get("/health")
async def health_check():
    """Detailed health check."""
    return {
        "status": "healthy",
        "api_version": "0.1.0",
        "borg_available": True  # TODO: Check if borg is available
    }


if __name__ == "__main__":
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True if os.getenv("ENVIRONMENT") == "development" else False
    )