"""
Scheduler service for managing backup jobs using APScheduler.
"""
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from sqlalchemy.orm import Session
from datetime import datetime
from typing import Optional
import logging
import subprocess
import os
import socket

from ..database import get_db_sync
from ..models.backup_job import BackupJob, BackupJobRun
from ..models.archive import Archive
from ..services.borg_service import BorgService

logger = logging.getLogger(__name__)


class SchedulerService:
    """Service for managing scheduled backup jobs."""
    
    def __init__(self, database_url: str):
        """Initialize the scheduler with an in-memory job store."""
        # Use default in-memory jobstore to avoid serialization issues
        self.scheduler = AsyncIOScheduler()
        self._started = False
    
    def start(self):
        """Start the scheduler."""
        if not self._started:
            self.scheduler.start()
            self._started = True
            logger.info("Scheduler started")
            
            # Load and schedule all enabled jobs
            self._load_jobs_from_database()
    
    def shutdown(self):
        """Shutdown the scheduler."""
        if self._started:
            self.scheduler.shutdown()
            self._started = False
            logger.info("Scheduler shutdown")
    
    def _load_jobs_from_database(self):
        """Load all enabled backup jobs from database and schedule them."""
        db = next(get_db_sync())
        try:
            jobs = db.query(BackupJob).filter(BackupJob.enabled == True).all()
            for job in jobs:
                self.schedule_job(job)
                logger.info(f"Loaded job: {job.name}")
        finally:
            db.close()
    
    def schedule_job(self, job: BackupJob):
        """Schedule or reschedule a backup job."""
        job_id = f"backup_job_{job.id}"
        
        # Remove existing job if it exists
        if self.scheduler.get_job(job_id):
            self.scheduler.remove_job(job_id)
        
        # Create cron trigger
        try:
            trigger = CronTrigger.from_crontab(job.schedule_cron, timezone=job.timezone)
        except Exception as e:
            logger.error(f"Invalid cron expression for job {job.name}: {e}")
            return
        
        # Schedule the job
        self.scheduler.add_job(
            self._execute_backup_job,
            trigger=trigger,
            id=job_id,
            args=[job.id],
            name=job.name,
            replace_existing=True
        )
        
        # Update next_run_at
        next_run = self.scheduler.get_job(job_id).next_run_time
        db = next(get_db_sync())
        try:
            db_job = db.query(BackupJob).filter(BackupJob.id == job.id).first()
            if db_job:
                db_job.next_run_at = next_run
                db.commit()
        finally:
            db.close()
        
        logger.info(f"Scheduled job '{job.name}' with cron: {job.schedule_cron}")
    
    def unschedule_job(self, job_id: int):
        """Remove a job from the scheduler."""
        scheduler_job_id = f"backup_job_{job_id}"
        if self.scheduler.get_job(scheduler_job_id):
            self.scheduler.remove_job(scheduler_job_id)
            logger.info(f"Unscheduled job ID: {job_id}")
    
    async def run_job_now(self, job_id: int) -> BackupJobRun:
        """Manually trigger a backup job to run immediately."""
        return await self._execute_backup_job(job_id)
    
    async def _execute_backup_job(self, job_id: int) -> BackupJobRun:
        """Execute a backup job."""
        db = next(get_db_sync())
        
        try:
            # Get the job
            job = db.query(BackupJob).filter(BackupJob.id == job_id).first()
            if not job:
                logger.error(f"Job {job_id} not found")
                return None
            
            # Create a job run record
            job_run = BackupJobRun(
                job_id=job.id,
                started_at=datetime.utcnow(),
                status="running"
            )
            db.add(job_run)
            db.commit()
            db.refresh(job_run)
            
            # Update job status
            job.last_status = "running"
            job.last_run_at = datetime.utcnow()
            db.commit()
            
            logger.info(f"Starting backup job: {job.name}")
            
            # Execute pre-backup script if defined
            if job.pre_backup_script:
                await self._run_script(job.pre_backup_script, job_run, db)
            
            # Execute the backup
            success = await self._run_backup(job, job_run, db)
            
            # Execute post-backup script if defined
            if job.post_backup_script:
                await self._run_script(job.post_backup_script, job_run, db)
            
            # Update job run status
            job_run.finished_at = datetime.utcnow()
            job_run.duration_seconds = int((job_run.finished_at - job_run.started_at).total_seconds())
            job_run.status = "success" if success else "failed"
            
            # Update job status
            job.last_status = job_run.status
            
            db.commit()
            
            logger.info(f"Backup job {job.name} completed with status: {job_run.status}")
            
            return job_run
            
        except Exception as e:
            logger.error(f"Error executing backup job {job_id}: {e}", exc_info=True)
            
            # Update job run with error
            if job_run:
                job_run.status = "failed"
                job_run.error_message = str(e)
                job_run.finished_at = datetime.utcnow()
                if job:
                    job.last_status = "failed"
                db.commit()
            
            return job_run
        
        finally:
            db.close()
    
    async def _run_backup(self, job: BackupJob, job_run: BackupJobRun, db: Session) -> bool:
        """Execute the actual borg backup command."""
        try:
            # Get repository
            from ..models.repository import Repository
            repo = db.query(Repository).filter(Repository.id == job.repository_id).first()
            if not repo:
                raise Exception(f"Repository {job.repository_id} not found")
            
            # Build borg create command
            borg_service = BorgService()
            
            # Generate archive name
            archive_name = job.archive_name_pattern.format(
                hostname=socket.gethostname(),
                now=datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%S")
            )
            
            # Build command
            cmd = ["borg", "create"]
            
            # Add compression
            if job.compression and job.compression != "none":
                cmd.extend(["--compression", job.compression])
            
            # Add exclusion patterns
            for pattern in job.exclusion_patterns:
                cmd.extend(["--exclude", pattern])
            
            # Add stats and progress
            cmd.extend(["--stats", "--json"])
            
            # Add archive path
            archive_path = f"{repo.url}::{archive_name}"
            cmd.append(archive_path)
            
            # Add source paths
            cmd.extend(job.source_paths)
            
            # Set environment variables
            env = os.environ.copy()
            if repo.passphrase:
                env["BORG_PASSPHRASE"] = repo.passphrase
            
            # Build SSH command for SSH repositories
            if repo.repo_type == "ssh":
                ssh_options = [
                    "-o", "StrictHostKeyChecking=no",
                    "-o", "UserKnownHostsFile=/dev/null",
                    "-o", "LogLevel=ERROR",
                    "-o", "BatchMode=yes"
                ]
                
                # Add SSH key if using key authentication
                if repo.ssh_auth_method == "key" and repo.ssh_key_path:
                    ssh_options.extend(["-i", repo.ssh_key_path])
                
                env["BORG_RSH"] = "ssh " + " ".join(ssh_options)
                
                # Set remote path if specified
                if repo.remote_path:
                    cmd.extend(["--remote-path", repo.remote_path])
                
                # Handle password authentication
                if repo.ssh_auth_method == "password" and repo.ssh_password:
                    env["SSHPASS"] = repo.ssh_password
                    # Use sshpass for password authentication
                    env["BORG_RSH"] = f"sshpass -e ssh " + " ".join(ssh_options)
            
            # Execute command
            logger.info(f"Executing: {' '.join(cmd[:-len(job.source_paths)])}")
            result = subprocess.run(
                cmd,
                env=env,
                capture_output=True,
                text=True,
                timeout=3600  # 1 hour timeout
            )
            
            # Parse output
            job_run.log_output = result.stdout + result.stderr
            
            if result.returncode != 0:
                job_run.error_message = result.stderr
                logger.error(f"Backup failed: {result.stderr}")
                return False
            
            # Parse stats from JSON output
            import json
            try:
                # When --json is used, the entire stdout is JSON (not just last line)
                if result.stdout.strip():
                    stats_json = json.loads(result.stdout.strip())
                    logger.info(f"Successfully parsed borg JSON output")
                else:
                    logger.warning(f"No stdout output from borg. Stderr: {result.stderr[:200]}")
                    job_run.log_output += f"\n\nWarning: No JSON output from borg create"
                    stats_json = None
                
                if stats_json and 'archive' in stats_json:
                    stats = stats_json['archive']['stats']
                    job_run.bytes_processed = stats.get('original_size', 0)
                    job_run.bytes_deduplicated = stats.get('deduplicated_size', 0)
                    
                    # Create archive record
                    archive_info = stats_json['archive']
                    archive = Archive(
                        repository_id=repo.id,
                        name=archive_name,
                        borg_id=archive_info.get('id'),
                        start_time=datetime.fromisoformat(archive_info['start'].replace('Z', '+00:00')) if archive_info.get('start') else None,
                        end_time=datetime.fromisoformat(archive_info['end'].replace('Z', '+00:00')) if archive_info.get('end') else None,
                        duration=int(archive_info.get('duration', 0)),
                        original_size=stats.get('original_size', 0),
                        compressed_size=stats.get('compressed_size', 0),
                        deduplicated_size=stats.get('deduplicated_size', 0),
                        nfiles=stats.get('nfiles', 0)
                    )
                    db.add(archive)
                    db.commit()
                    db.refresh(archive)
                    
                    job_run.archive_id = archive.id
                    logger.info(f"Created archive record with ID {archive.id}")
                
            except (json.JSONDecodeError, KeyError, TypeError) as e:
                logger.warning(f"Could not parse backup stats: {e}")
            
            # Run prune if enabled
            if job.auto_prune:
                await self._run_prune(job, repo, env, job_run)
            
            return True
            
        except Exception as e:
            logger.error(f"Backup execution error: {e}", exc_info=True)
            job_run.error_message = str(e)
            return False
    
    async def _run_prune(self, job: BackupJob, repo, env: dict, job_run: BackupJobRun):
        """Execute borg prune command."""
        try:
            # Check if any retention policy is set
            has_retention_policy = any([
                job.keep_last,
                job.keep_hourly,
                job.keep_daily,
                job.keep_weekly,
                job.keep_monthly,
                job.keep_yearly
            ])
            
            if not has_retention_policy:
                logger.info("Skipping prune: No retention policies configured")
                job_run.log_output += "\n\nPrune skipped: No retention policies configured"
                return
            
            cmd = ["borg", "prune", "--stats", "--list"]
            
            # Add remote path for SSH repos
            if repo.repo_type == "ssh" and repo.remote_path:
                cmd.extend(["--remote-path", repo.remote_path])
            
            # Add retention rules
            if job.keep_last:
                cmd.extend(["--keep-last", str(job.keep_last)])
            if job.keep_hourly:
                cmd.extend(["--keep-hourly", str(job.keep_hourly)])
            if job.keep_daily:
                cmd.extend(["--keep-daily", str(job.keep_daily)])
            if job.keep_weekly:
                cmd.extend(["--keep-weekly", str(job.keep_weekly)])
            if job.keep_monthly:
                cmd.extend(["--keep-monthly", str(job.keep_monthly)])
            if job.keep_yearly:
                cmd.extend(["--keep-yearly", str(job.keep_yearly)])
            
            cmd.append(repo.url)
            
            logger.info(f"Running prune: {' '.join(cmd)}")
            result = subprocess.run(
                cmd,
                env=env,
                capture_output=True,
                text=True,
                timeout=600  # 10 minutes timeout
            )
            
            if result.returncode == 0:
                job_run.log_output += f"\n\nPrune output:\n{result.stdout}"
                logger.info("Prune completed successfully")
                
                # Run compact to actually free up space
                await self._run_compact(repo, env, job_run)
            else:
                logger.warning(f"Prune failed: {result.stderr}")
                job_run.log_output += f"\n\nPrune error:\n{result.stderr}"
                
        except Exception as e:
            logger.error(f"Prune execution error: {e}", exc_info=True)
            job_run.log_output += f"\n\nPrune error: {str(e)}"
    
    async def _run_compact(self, repo, env: dict, job_run: BackupJobRun):
        """Execute borg compact command to free up space after prune."""
        try:
            cmd = ["borg", "compact", "--verbose"]
            
            # Add remote path for SSH repos
            if repo.repo_type == "ssh" and repo.remote_path:
                cmd.extend(["--remote-path", repo.remote_path])
            
            cmd.append(repo.url)
            
            logger.info(f"Running compact: {' '.join(cmd)}")
            result = subprocess.run(
                cmd,
                env=env,
                capture_output=True,
                text=True,
                timeout=600  # 10 minutes timeout
            )
            
            if result.returncode == 0:
                job_run.log_output += f"\n\nCompact output:\n{result.stdout}"
                logger.info("Compact completed successfully")
            else:
                logger.warning(f"Compact failed: {result.stderr}")
                job_run.log_output += f"\n\nCompact error:\n{result.stderr}"
                
        except Exception as e:
            logger.error(f"Compact execution error: {e}", exc_info=True)
            job_run.log_output += f"\n\nCompact error: {str(e)}"
    
    async def _run_script(self, script: str, job_run: BackupJobRun, db: Session):
        """Execute a pre/post backup script."""
        try:
            logger.info(f"Running script: {script[:50]}...")
            result = subprocess.run(
                script,
                shell=True,
                capture_output=True,
                text=True,
                timeout=300  # 5 minutes timeout
            )
            
            script_output = f"\n\nScript output:\n{result.stdout}\n{result.stderr}"
            job_run.log_output = (job_run.log_output or "") + script_output
            
            if result.returncode != 0:
                logger.warning(f"Script exited with code {result.returncode}")
                
        except Exception as e:
            logger.error(f"Script execution error: {e}", exc_info=True)
            job_run.log_output = (job_run.log_output or "") + f"\n\nScript error: {str(e)}"


# Global scheduler instance
_scheduler: Optional[SchedulerService] = None


def get_scheduler() -> SchedulerService:
    """Get the global scheduler instance."""
    global _scheduler
    if _scheduler is None:
        raise RuntimeError("Scheduler not initialized")
    return _scheduler


def init_scheduler(database_url: str):
    """Initialize the global scheduler."""
    global _scheduler
    _scheduler = SchedulerService(database_url)
    return _scheduler
