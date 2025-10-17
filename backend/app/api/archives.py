from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List

from ..database import get_db
from ..models.archive import Archive, ArchiveCreate, ArchiveResponse, ArchiveProgress
from ..models.repository import Repository
from ..services.borg_service import BorgService

router = APIRouter()


@router.get("", response_model=List[ArchiveResponse])
@router.get("/", response_model=List[ArchiveResponse])
async def list_archives(
    repository_id: int = None,
    limit: int = 100,
    offset: int = 0,
    db: Session = Depends(get_db)
):
    """List archives, optionally filtered by repository."""
    query = db.query(Archive)
    
    if repository_id:
        query = query.filter(Archive.repository_id == repository_id)
    
    archives = query.offset(offset).limit(limit).all()
    return archives


@router.post("", response_model=ArchiveResponse)
@router.post("/", response_model=ArchiveResponse)
async def create_archive(
    archive: ArchiveCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """Create a new backup archive."""
    # Verify repository exists
    repository = db.query(Repository).filter(Repository.id == archive.repository_id).first()
    if not repository:
        raise HTTPException(status_code=404, detail="Repository not found")
    
    # Create archive record
    db_archive = Archive(
        repository_id=archive.repository_id,
        name=archive.name,
        borg_id=None,  # Will be set by borg service after creation
        comment=archive.comment
    )
    
    db.add(db_archive)
    db.commit()
    db.refresh(db_archive)
    
    # Start backup in background
    borg_service = BorgService(db)
    background_tasks.add_task(
        borg_service.create_archive,
        db_archive.id,
        archive.paths,
        archive.exclude_patterns,
        archive.compression,
        archive.checkpoint_interval
    )
    
    return db_archive


@router.get("/{archive_id}", response_model=ArchiveResponse)
async def get_archive(archive_id: int, db: Session = Depends(get_db)):
    """Get a specific archive."""
    archive = db.query(Archive).filter(Archive.id == archive_id).first()
    if not archive:
        raise HTTPException(status_code=404, detail="Archive not found")
    return archive


@router.delete("/{archive_id}")
async def delete_archive(archive_id: int, db: Session = Depends(get_db)):
    """Delete an archive."""
    archive = db.query(Archive).filter(Archive.id == archive_id).first()
    if not archive:
        raise HTTPException(status_code=404, detail="Archive not found")
    
    borg_service = BorgService(db)
    await borg_service.delete_archive(archive)
    
    db.delete(archive)
    db.commit()
    return {"message": "Archive deleted successfully"}


@router.get("/{archive_id}/info")
async def get_archive_info(archive_id: int, db: Session = Depends(get_db)):
    """Get detailed archive information."""
    archive = db.query(Archive).filter(Archive.id == archive_id).first()
    if not archive:
        raise HTTPException(status_code=404, detail="Archive not found")
    
    borg_service = BorgService(db)
    info = await borg_service.get_archive_info(archive)
    return info


@router.post("/{archive_id}/refresh")
async def refresh_archive_stats(archive_id: int, db: Session = Depends(get_db)):
    """Fetch and update archive statistics from Borg."""
    archive = db.query(Archive).filter(Archive.id == archive_id).first()
    if not archive:
        raise HTTPException(status_code=404, detail="Archive not found")
    
    borg_service = BorgService(db)
    result = await borg_service.get_archive_info(archive)
    
    if not result.get("success"):
        raise HTTPException(
            status_code=400,
            detail=f"Failed to fetch archive info: {result.get('stderr', 'Unknown error')}"
        )
    
    # Extract stats from the borg info result
    archive_data = result.get("data", {})
    archives = archive_data.get("archives", [])
    
    if archives:
        stats = archives[0].get("stats", {})
        
        # Update archive with detailed statistics
        archive.original_size = stats.get("original_size")
        archive.compressed_size = stats.get("compressed_size")
        archive.deduplicated_size = stats.get("deduplicated_size")
        archive.nfiles = stats.get("nfiles")
        
        # Update additional metadata if available
        if "start" in archives[0]:
            from datetime import datetime
            try:
                archive.start_time = datetime.fromisoformat(archives[0]["start"].replace('Z', '+00:00'))
            except (ValueError, AttributeError):
                pass
        
        if "end" in archives[0]:
            from datetime import datetime
            try:
                archive.end_time = datetime.fromisoformat(archives[0]["end"].replace('Z', '+00:00'))
            except (ValueError, AttributeError):
                pass
        
        if "duration" in archives[0]:
            # Convert duration to integer (seconds), Borg returns float
            archive.duration = int(archives[0]["duration"])
        
        if "hostname" in archives[0]:
            archive.hostname = archives[0]["hostname"]
        
        if "username" in archives[0]:
            archive.username = archives[0]["username"]
        
        db.commit()
        db.refresh(archive)
    
    return archive


@router.get("/{archive_id}/list")
async def list_archive_contents(
    archive_id: int,
    path: str = "",
    db: Session = Depends(get_db)
):
    """List files in an archive."""
    archive = db.query(Archive).filter(Archive.id == archive_id).first()
    if not archive:
        raise HTTPException(status_code=404, detail="Archive not found")
    
    borg_service = BorgService(db)
    contents = await borg_service.list_archive_contents(archive, path)
    return contents


@router.get("/{archive_id}/progress", response_model=ArchiveProgress)
async def get_archive_progress(archive_id: int, db: Session = Depends(get_db)):
    """Get backup progress for a running archive creation."""
    archive = db.query(Archive).filter(Archive.id == archive_id).first()
    if not archive:
        raise HTTPException(status_code=404, detail="Archive not found")
    
    # If archive is completed, return 100% progress
    if archive.end_time:
        return ArchiveProgress(
            archive_name=archive.name,
            original_size=archive.original_size or 0,
            compressed_size=archive.compressed_size or 0,
            deduplicated_size=archive.deduplicated_size or 0,
            nfiles=archive.nfiles or 0,
            path=None,
            time=0.0,
            progress=1.0
        )
    
    # If archive is still running, return partial progress (simplified for now)
    if archive.start_time and not archive.end_time:
        # Calculate rough progress based on elapsed time (placeholder)
        from datetime import datetime
        elapsed = (datetime.utcnow() - archive.start_time).total_seconds()
        # Assume most backups take 5-30 minutes, so scale accordingly
        estimated_progress = min(elapsed / (15 * 60), 0.95)  # Cap at 95% until done
        
        return ArchiveProgress(
            archive_name=archive.name,
            original_size=0,  # Will be updated during backup
            compressed_size=0,
            deduplicated_size=0,
            nfiles=0,
            path="Backing up files...",
            time=elapsed,
            progress=estimated_progress
        )
    
    # Archive not started yet
    return ArchiveProgress(
        archive_name=archive.name,
        original_size=0,
        compressed_size=0,
        deduplicated_size=0,
        nfiles=0,
        path="Preparing backup...",
        time=0.0,
        progress=0.0
    )