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
    version="0.1.1",
    lifespan=lifespan,
    redirect_slashes=True  # Automatically redirect trailing slashes
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


@app.get("/api")
async def api_root():
    """API health check endpoint."""
    return {"message": "BorgDash API is running", "version": "0.1.1"}


@app.get("/api/health")
async def health_check():
    """Detailed health check."""
    return {
        "status": "healthy",
        "api_version": "0.1.1",
        "borg_available": True  # TODO: Check if borg is available
    }


# Mount static files - Frontend will be served from here
# This must be last so API routes take precedence
frontend_dist = "/app/frontend/dist"
if os.path.exists(frontend_dist):
    from fastapi.responses import FileResponse
    
    @app.get("/{full_path:path}")
    async def serve_frontend(full_path: str):
        """Serve frontend static files and handle SPA routing."""
        file_path = os.path.join(frontend_dist, full_path)
        
        # If file exists, serve it
        if os.path.isfile(file_path):
            return FileResponse(file_path)
        
        # For SPA routing, serve index.html for non-API routes
        if not full_path.startswith("api/"):
            index_path = os.path.join(frontend_dist, "index.html")
            if os.path.isfile(index_path):
                return FileResponse(index_path)
        
        # If nothing found, 404
        raise HTTPException(status_code=404, detail="Not found")


if __name__ == "__main__":
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True if os.getenv("ENVIRONMENT") == "development" else False
    )