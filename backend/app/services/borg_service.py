import asyncio
import json
import subprocess
import os
import shlex
from typing import List, Dict, Any, Optional
from datetime import datetime
from sqlalchemy.orm import Session

from ..config import settings
from ..models.repository import Repository, RepositoryStatus
from ..models.archive import Archive
from ..database import SessionLocal


class BorgService:
    """Service for interacting with Borg Backup CLI."""
    
    def __init__(self, db: Optional[Session] = None):
        self.borg_binary = settings.BORG_BINARY
        self.ssh_key_dir = settings.SSH_KEY_DIR
        self.db = db
    
    def _get_db_session(self) -> Session:
        """Get database session, create new one if not provided."""
        if self.db is not None:
            return self.db
        return SessionLocal()
    
    async def _run_borg_command(
        self, 
        command: List[str], 
        env: Optional[Dict[str, str]] = None,
        input_data: Optional[str] = None
    ) -> Dict[str, Any]:
        """Execute a borg command asynchronously."""
        
        # Prepare environment
        cmd_env = os.environ.copy()
        if env:
            cmd_env.update(env)
        
        # Always use JSON output when possible, but don't add --json if --json-lines is already present
        if "--json" not in command and "--json-lines" not in command and ("info" in command or "list" in command):
            command.append("--json")
        
        try:
            process = await asyncio.create_subprocess_exec(
                *command,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                stdin=asyncio.subprocess.PIPE if input_data else None,
                env=cmd_env
            )
            
            stdout, stderr = await process.communicate(
                input=input_data.encode() if input_data else None
            )
            
            result = {
                "returncode": process.returncode,
                "stdout": stdout.decode("utf-8"),
                "stderr": stderr.decode("utf-8"),
                "success": process.returncode == 0
            }
            
            # Try to parse JSON output
            if result["success"] and result["stdout"]:
                try:
                    result["data"] = json.loads(result["stdout"])
                except json.JSONDecodeError:
                    result["data"] = None
            
            return result
            
        except Exception as e:
            return {
                "returncode": -1,
                "stdout": "",
                "stderr": str(e),
                "success": False,
                "data": None
            }
    
    def _build_repository_url(self, repository: Repository) -> str:
        """Build the complete repository URL with SSH options."""
        if repository.repo_type == "local":
            return repository.url
        
        # SSH repository
        url = repository.url
        
        # Add SSH key if specified
        if repository.ssh_key_path and os.path.exists(repository.ssh_key_path):
            # Extract hostname and path from SSH URL
            # Format: ssh://user@host:port/path or user@host:/path
            if url.startswith("ssh://"):
                # ssh://user@host:port/path format
                return url
            else:
                # user@host:/path format  
                return url
        
        return url
    
    def _get_repository_env(self, repository: Repository, passphrase: str = None) -> Dict[str, str]:
        """Get environment variables for repository operations."""
        env = {}
        
        # Set passphrase if provided
        if passphrase:
            env["BORG_PASSPHRASE"] = passphrase
        
        # SSH configuration
        if repository.repo_type == "ssh":
            # Handle SSH authentication method
            if repository.ssh_auth_method == "password":
                # For password auth, we need to use sshpass
                if repository.ssh_password:
                    env["SSHPASS"] = repository.ssh_password
        
        # Disable prompts
        env["BORG_UNKNOWN_UNENCRYPTED_REPO_ACCESS_IS_OK"] = "yes"
        env["BORG_RELOCATED_REPO_ACCESS_IS_OK"] = "yes"
        
        return env
    
    def _build_borg_command(self, repository: Repository, base_command: List[str]) -> List[str]:
        """Build borg command with SSH and remote path options."""
        command = base_command.copy()
        
        if repository.repo_type == "ssh":
            # Add remote path parameter
            if repository.remote_path:
                command.extend(["--remote-path", repository.remote_path])
            
            # Build SSH command with host key checking disabled for all SSH repos
            ssh_options = [
                "-o", "StrictHostKeyChecking=no",
                "-o", "UserKnownHostsFile=/dev/null", 
                "-o", "LogLevel=ERROR",
                "-o", "BatchMode=yes"  # Prevent interactive prompts
            ]
            
            # Add SSH key if using key authentication
            if repository.ssh_auth_method == "key" and repository.ssh_key_path:
                ssh_options.extend(["-i", repository.ssh_key_path])
            
            ssh_command = "ssh " + " ".join(ssh_options)
            command.extend(["--rsh", ssh_command])
        
        return command
    
    async def init_repository(
        self, 
        repository_id: int, 
        passphrase: str = None,
        encryption_mode: str = "repokey-blake2"
    ) -> Dict[str, Any]:
        """Initialize a new Borg repository."""
        
        # Get a database session (create new if running as background task)
        db = self._get_db_session()
        need_to_close = self.db is None  # Close session if we created it
        
        try:
            # Get repository from database
            repository = db.query(Repository).filter(Repository.id == repository_id).first()
            
            if not repository:
                return {"success": False, "error": "Repository not found"}
            
            # Update status to indicate initialization started
            repository.status = "initializing"
            db.commit()
            
            repo_url = self._build_repository_url(repository)
            env = self._get_repository_env(repository, passphrase)
            
            base_command = [
                self.borg_binary, "init",
                f"--encryption={encryption_mode}",
                repo_url
            ]
            
            command = self._build_borg_command(repository, base_command)
            
            result = await self._run_borg_command(command, env)
            
            # Update repository status in database based on result
            if result["success"]:
                repository.status = "initialized"
                print(f"Repository '{repository.name}' initialized successfully")
            else:
                repository.status = "error"
                error_msg = result.get('stderr', 'Unknown error')
                print(f"Failed to initialize repository '{repository.name}': {error_msg}")
                print(f"Full error details: {result}")
                
                # Log SSH command for debugging
                if repository.repo_type == "ssh":
                    print(f"SSH command used: {env.get('BORG_RSH', 'None')}")
                    print(f"Repository URL: {repo_url}")
            
            db.commit()
            return result
            
        except Exception as e:
            # Update status to error on exception
            try:
                repository = db.query(Repository).filter(Repository.id == repository_id).first()
                if repository:
                    repository.status = "error"
                    db.commit()
            except:
                pass
            print(f"Exception during repository initialization: {str(e)}")
            return {"success": False, "error": str(e)}
        
        finally:
            if need_to_close:
                db.close()
    
    async def create_archive(
        self,
        archive_id: int,
        paths: List[str],
        exclude_patterns: Optional[List[str]] = None,
        compression: str = "lz4",
        checkpoint_interval: int = 1800
    ) -> Dict[str, Any]:
        """Create a new archive."""
        
        if not self.db:
            return {"success": False, "error": "Database session not available"}
        
        # Get archive and repository from database
        archive = self.db.query(Archive).filter(Archive.id == archive_id).first()
        if not archive:
            return {"success": False, "error": "Archive not found"}
        
        repository = self.db.query(Repository).filter(Repository.id == archive.repository_id).first()
        if not repository:
            return {"success": False, "error": "Repository not found"}
        
        repo_url = self._build_repository_url(repository)
        archive_name = f"{repo_url}::{archive.name}"
        
        base_command = [
            self.borg_binary, "create",
            f"--compression={compression}",
            f"--checkpoint-interval={checkpoint_interval}",
            "--stats", "--json",
            archive_name
        ] + paths
        
        # Add exclude patterns
        if exclude_patterns:
            for pattern in exclude_patterns:
                base_command.extend(["--exclude", pattern])
        
        # Build command with SSH options
        command = self._build_borg_command(repository, base_command)
        
        # Mark archive as started
        archive.start_time = datetime.utcnow()
        self.db.commit()
        
        env = self._get_repository_env(repository, repository.passphrase)
        result = await self._run_borg_command(command, env)

        # Update archive with stats if successful
        if result["success"] and result.get("data"):
            stats = result["data"]
            archive.end_time = datetime.utcnow()
            archive.original_size = stats.get("archive", {}).get("stats", {}).get("original_size")
            archive.compressed_size = stats.get("archive", {}).get("stats", {}).get("compressed_size")  
            archive.deduplicated_size = stats.get("archive", {}).get("stats", {}).get("deduplicated_size")
            archive.nfiles = stats.get("archive", {}).get("stats", {}).get("nfiles")
            # Only set borg_id if we actually get a non-empty value from borg
            borg_id = stats.get("archive", {}).get("id")
            if borg_id:
                archive.borg_id = borg_id
            archive.stats = json.dumps(stats)
            self.db.commit()
        else:
            # Mark archive as failed if borg command failed
            archive.end_time = datetime.utcnow()
            # Store error information in stats field
            error_info = {
                "error": result.get("stderr", "Unknown error"),
                "returncode": result.get("returncode", -1)
            }
            archive.stats = json.dumps(error_info)
            self.db.commit()

        return result
    
    async def list_archives(self, repository: Repository) -> Dict[str, Any]:
        """List all archives in a repository."""
        repo_url = self._build_repository_url(repository)
        
        base_command = [
            self.borg_binary, "list",
            "--json",
            repo_url
        ]
        
        command = self._build_borg_command(repository, base_command)
        env = self._get_repository_env(repository, repository.passphrase)
        result = await self._run_borg_command(command, env)
        return result
    
    async def get_repository_info(self, repository: Repository) -> Dict[str, Any]:
        """Get repository information."""
        repo_url = self._build_repository_url(repository)
        
        base_command = [
            self.borg_binary, "info",
            "--json",
            repo_url
        ]
        
        command = self._build_borg_command(repository, base_command)
        env = self._get_repository_env(repository, repository.passphrase)
        result = await self._run_borg_command(command, env)
        return result
    
    async def get_archive_info(self, archive: Archive) -> Dict[str, Any]:
        """Get detailed archive information."""
        # Get repository from database
        db = self._get_db_session()
        need_to_close = self.db is None
        
        try:
            repository = db.query(Repository).filter(Repository.id == archive.repository_id).first()
            
            if not repository:
                return {"success": False, "error": "Repository not found"}
            
            repo_url = self._build_repository_url(repository)
            archive_name = f"{repo_url}::{archive.name}"
            
            base_command = [
                self.borg_binary, "info",
                "--json",
                archive_name
            ]
            
            command = self._build_borg_command(repository, base_command)
            env = self._get_repository_env(repository, repository.passphrase)
            result = await self._run_borg_command(command, env)
            return result
        finally:
            if need_to_close:
                db.close()
    
    async def list_archive_contents(
        self, 
        archive: Archive, 
        path: str = ""
    ) -> Dict[str, Any]:
        """List files in an archive."""
        # Get repository from database
        db = self._get_db_session()
        need_to_close = self.db is None
        
        try:
            repository = db.query(Repository).filter(Repository.id == archive.repository_id).first()
            
            if not repository:
                return {"success": False, "error": "Repository not found"}
            
            repo_url = self._build_repository_url(repository)
            archive_name = f"{repo_url}::{archive.name}"
            
            base_command = [
                self.borg_binary, "list",
                "--json-lines",
                archive_name
            ]
            
            if path:
                base_command.append(path)
            
            command = self._build_borg_command(repository, base_command)
            env = self._get_repository_env(repository, repository.passphrase)
            result = await self._run_borg_command(command, env)
            
            # Return the parsed file list or empty list if failed
            if result["success"]:
                files = []
                
                # For --json-lines, we need to parse each line separately
                if result["stdout"]:
                    for line in result["stdout"].strip().split('\n'):
                        if line.strip():  # Skip empty lines
                            try:
                                file_info = json.loads(line)
                                files.append(file_info)
                            except json.JSONDecodeError:
                                # Skip lines that aren't valid JSON
                                continue
                
                return files
            else:
                # Return empty list if command failed
                return []
        finally:
            if need_to_close:
                db.close()
    
    async def delete_archive(self, archive: Archive) -> Dict[str, Any]:
        """Delete an archive."""
        # Get repository from database
        db = self._get_db_session()
        need_to_close = self.db is None
        
        try:
            repository = db.query(Repository).filter(Repository.id == archive.repository_id).first()
            
            if not repository:
                return {"success": False, "error": "Repository not found"}
            
            repo_url = self._build_repository_url(repository)
            archive_name = f"{repo_url}::{archive.name}"
            
            base_command = [
                self.borg_binary, "delete",
                archive_name
            ]
            
            command = self._build_borg_command(repository, base_command)
            env = self._get_repository_env(repository, repository.passphrase)
            result = await self._run_borg_command(command, env)
            return result
        finally:
            if need_to_close:
                db.close()
    
    async def test_repository_connection(self, repository: Repository) -> RepositoryStatus:
        """Test if repository is accessible."""
        try:
            result = await self.get_repository_info(repository)
            
            if result["success"]:
                return RepositoryStatus(
                    id=repository.id,
                    name=repository.name,
                    status="connected",
                    message="Repository is accessible",
                    last_checked=datetime.utcnow()
                )
            else:
                return RepositoryStatus(
                    id=repository.id,
                    name=repository.name,
                    status="error",
                    message=result["stderr"],
                    last_checked=datetime.utcnow()
                )
                
        except Exception as e:
            return RepositoryStatus(
                id=repository.id,
                name=repository.name,
                status="unreachable",
                message=str(e),
                last_checked=datetime.utcnow()
            )