from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text, JSON
from sqlalchemy.orm import relationship
from datetime import datetime
from .repository import Base


class BackupJob(Base):
    """Scheduled backup job configuration."""
    __tablename__ = "backup_jobs"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True, nullable=False)
    repository_id = Column(Integer, ForeignKey("repositories.id"), nullable=False)
    enabled = Column(Boolean, default=True, nullable=False)
    
    # Source configuration
    source_paths = Column(JSON, nullable=False)  # ["path1", "path2"]
    exclusion_patterns = Column(JSON, default=list)  # ["*.tmp", "node_modules"]
    
    # Schedule (cron expression)
    schedule_cron = Column(String, nullable=False)  # "0 2 * * *"
    timezone = Column(String, default="UTC")
    
    # Backup options
    compression = Column(String, default="lz4")  # lz4, zstd, zlib, lzma, none
    archive_name_pattern = Column(String, default="{hostname}-{now}")
    
    # Pre/Post backup hooks (shell commands)
    pre_backup_script = Column(Text, nullable=True)
    post_backup_script = Column(Text, nullable=True)
    
    # Retention/Prune settings
    keep_last = Column(Integer, nullable=True)
    keep_hourly = Column(Integer, nullable=True)
    keep_daily = Column(Integer, nullable=True)
    keep_weekly = Column(Integer, nullable=True)
    keep_monthly = Column(Integer, nullable=True)
    keep_yearly = Column(Integer, nullable=True)
    auto_prune = Column(Boolean, default=True)
    
    # Tracking
    last_run_at = Column(DateTime, nullable=True)
    last_status = Column(String, nullable=True)  # "success", "failed", "running"
    next_run_at = Column(DateTime, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    repository = relationship("Repository", back_populates="backup_jobs")
    job_runs = relationship("BackupJobRun", back_populates="job", cascade="all, delete-orphan")


class BackupJobRun(Base):
    """History of backup job executions."""
    __tablename__ = "backup_job_runs"
    
    id = Column(Integer, primary_key=True, index=True)
    job_id = Column(Integer, ForeignKey("backup_jobs.id"), nullable=False)
    archive_id = Column(Integer, ForeignKey("archives.id"), nullable=True)
    
    started_at = Column(DateTime, nullable=False)
    finished_at = Column(DateTime, nullable=True)
    status = Column(String, nullable=False)  # "running", "success", "failed"
    
    # Execution details
    log_output = Column(Text, nullable=True)
    error_message = Column(Text, nullable=True)
    
    # Statistics
    bytes_processed = Column(Integer, nullable=True)
    bytes_deduplicated = Column(Integer, nullable=True)
    duration_seconds = Column(Integer, nullable=True)
    
    # Relationships
    job = relationship("BackupJob", back_populates="job_runs")
    archive = relationship("Archive")
