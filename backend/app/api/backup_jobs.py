from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime

from ..database import get_db
from ..models.backup_job import BackupJob, BackupJobRun
from ..models.repository import Repository
from ..services.borg_service import BorgService
from ..services.scheduler_service import get_scheduler

router = APIRouter(tags=["backup-jobs"])


# Pydantic schemas
class BackupJobBase(BaseModel):
    name: str
    repository_id: int
    enabled: bool = True
    source_paths: List[str]
    exclusion_patterns: List[str] = []
    schedule_cron: str
    timezone: str = "UTC"
    compression: str = "lz4"
    archive_name_pattern: str = "{hostname}-{now}"
    pre_backup_script: Optional[str] = None
    post_backup_script: Optional[str] = None
    keep_last: Optional[int] = None
    keep_hourly: Optional[int] = None
    keep_daily: Optional[int] = None
    keep_weekly: Optional[int] = None
    keep_monthly: Optional[int] = None
    keep_yearly: Optional[int] = None
    auto_prune: bool = True


class BackupJobCreate(BackupJobBase):
    pass


class BackupJobUpdate(BaseModel):
    name: Optional[str] = None
    repository_id: Optional[int] = None
    enabled: Optional[bool] = None
    source_paths: Optional[List[str]] = None
    exclusion_patterns: Optional[List[str]] = None
    schedule_cron: Optional[str] = None
    timezone: Optional[str] = None
    compression: Optional[str] = None
    archive_name_pattern: Optional[str] = None
    pre_backup_script: Optional[str] = None
    post_backup_script: Optional[str] = None
    keep_last: Optional[int] = None
    keep_hourly: Optional[int] = None
    keep_daily: Optional[int] = None
    keep_weekly: Optional[int] = None
    keep_monthly: Optional[int] = None
    keep_yearly: Optional[int] = None
    auto_prune: Optional[bool] = None


class BackupJobResponse(BackupJobBase):
    id: int
    last_run_at: Optional[datetime]
    last_status: Optional[str]
    next_run_at: Optional[datetime]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class BackupJobRunResponse(BaseModel):
    id: int
    job_id: int
    archive_id: Optional[int]
    started_at: datetime
    finished_at: Optional[datetime]
    status: str
    log_output: Optional[str]
    error_message: Optional[str]
    bytes_processed: Optional[int]
    bytes_deduplicated: Optional[int]
    duration_seconds: Optional[int]

    class Config:
        from_attributes = True


@router.get("", response_model=List[BackupJobResponse])
async def list_backup_jobs(
    db: Session = Depends(get_db),
    enabled: Optional[bool] = None
):
    """List all backup jobs."""
    query = db.query(BackupJob)
    if enabled is not None:
        query = query.filter(BackupJob.enabled == enabled)
    jobs = query.order_by(BackupJob.name).all()
    return jobs


@router.post("", response_model=BackupJobResponse, status_code=201)
async def create_backup_job(
    job: BackupJobCreate,
    db: Session = Depends(get_db)
):
    """Create a new backup job."""
    # Check if repository exists
    repo = db.query(Repository).filter(Repository.id == job.repository_id).first()
    if not repo:
        raise HTTPException(status_code=404, detail="Repository not found")
    
    # Check if job name already exists
    existing = db.query(BackupJob).filter(BackupJob.name == job.name).first()
    if existing:
        raise HTTPException(status_code=400, detail="Job name already exists")
    
    # Validate source paths
    if not job.source_paths or len(job.source_paths) == 0:
        raise HTTPException(status_code=400, detail="At least one source path is required")
    
    # Create new job
    db_job = BackupJob(**job.model_dump())
    db.add(db_job)
    db.commit()
    db.refresh(db_job)
    
    # Schedule the job with APScheduler
    if db_job.enabled:
        try:
            scheduler = get_scheduler()
            scheduler.schedule_job(db_job)
        except Exception as e:
            # Log error but don't fail the creation
            print(f"Failed to schedule job: {e}")
    
    return db_job


@router.get("/{job_id}", response_model=BackupJobResponse)
async def get_backup_job(
    job_id: int,
    db: Session = Depends(get_db)
):
    """Get a specific backup job."""
    job = db.query(BackupJob).filter(BackupJob.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Backup job not found")
    return job


@router.put("/{job_id}", response_model=BackupJobResponse)
async def update_backup_job(
    job_id: int,
    job_update: BackupJobUpdate,
    db: Session = Depends(get_db)
):
    """Update a backup job."""
    job = db.query(BackupJob).filter(BackupJob.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Backup job not found")
    
    # Update fields
    update_data = job_update.model_dump(exclude_unset=True)
    
    # Check if repository exists if being updated
    if "repository_id" in update_data:
        repo = db.query(Repository).filter(Repository.id == update_data["repository_id"]).first()
        if not repo:
            raise HTTPException(status_code=404, detail="Repository not found")
    
    # Check if name already exists if being updated
    if "name" in update_data and update_data["name"] != job.name:
        existing = db.query(BackupJob).filter(BackupJob.name == update_data["name"]).first()
        if existing:
            raise HTTPException(status_code=400, detail="Job name already exists")
    
    for key, value in update_data.items():
        setattr(job, key, value)
    
    db.commit()
    db.refresh(job)
    
    # Reschedule the job with APScheduler
    try:
        scheduler = get_scheduler()
        if job.enabled:
            scheduler.schedule_job(job)
        else:
            scheduler.unschedule_job(job.id)
    except Exception as e:
        print(f"Failed to reschedule job: {e}")
    
    return job


@router.delete("/{job_id}", status_code=204)
async def delete_backup_job(
    job_id: int,
    db: Session = Depends(get_db)
):
    """Delete a backup job."""
    job = db.query(BackupJob).filter(BackupJob.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Backup job not found")
    
    # Remove job from APScheduler
    try:
        scheduler = get_scheduler()
        scheduler.unschedule_job(job.id)
    except Exception as e:
        print(f"Failed to unschedule job: {e}")
    
    db.delete(job)
    db.commit()
    return None


@router.post("/{job_id}/run", response_model=BackupJobRunResponse)
async def run_backup_job_now(
    job_id: int,
    db: Session = Depends(get_db)
):
    """Manually trigger a backup job to run immediately."""
    job = db.query(BackupJob).filter(BackupJob.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Backup job not found")
    
    # Trigger immediate execution via scheduler
    try:
        scheduler = get_scheduler()
        job_run = await scheduler.run_job_now(job.id)
        return job_run
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to run job: {str(e)}")


@router.get("/{job_id}/runs", response_model=List[BackupJobRunResponse])
async def get_job_runs(
    job_id: int,
    db: Session = Depends(get_db),
    limit: int = 50
):
    """Get execution history for a backup job."""
    job = db.query(BackupJob).filter(BackupJob.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Backup job not found")
    
    runs = db.query(BackupJobRun)\
        .filter(BackupJobRun.job_id == job_id)\
        .order_by(BackupJobRun.started_at.desc())\
        .limit(limit)\
        .all()
    
    return runs
