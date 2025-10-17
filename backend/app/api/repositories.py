from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime

from ..database import get_db
from ..models.repository import (
    Repository, RepositoryCreate, RepositoryUpdate, 
    RepositoryResponse, RepositoryStatus,
    RepositoryImport, RepositoryImportResponse
)
from ..models.archive import Archive, ArchiveResponse
from ..services.borg_service import BorgService

router = APIRouter()


@router.get("", response_model=List[RepositoryResponse])
@router.get("/", response_model=List[RepositoryResponse])
async def list_repositories(db: Session = Depends(get_db)):
    """List all repositories."""
    repositories = db.query(Repository).filter(Repository.is_active == True).all()
    return repositories


@router.post("", response_model=RepositoryResponse)
@router.post("/", response_model=RepositoryResponse)
async def create_repository(
    repository: RepositoryCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """Create and initialize a new repository."""
    # Check if repository name already exists
    existing = db.query(Repository).filter(Repository.name == repository.name).first()
    if existing:
        raise HTTPException(status_code=400, detail="Repository name already exists")
    
    # Create repository record
    import json
    db_repository = Repository(
        name=repository.name,
        url=repository.url,
        repo_type=repository.repo_type.value,
        encryption_mode=repository.encryption_mode.value if repository.encryption_mode else None,
        ssh_key_path=repository.ssh_key_path,
        remote_path=repository.remote_path,
        passphrase=repository.passphrase,  # Store passphrase (TODO: encrypt this)
        config=json.dumps(repository.config or {})
    )
    
    db.add(db_repository)
    db.commit()
    db.refresh(db_repository)
    
    # Initialize repository in background (don't pass db session to background task)
    borg_service = BorgService()  # No db session for background task
    background_tasks.add_task(
        borg_service.init_repository,
        db_repository.id,
        repository.passphrase
    )
    
    return db_repository


@router.get("/{repository_id}", response_model=RepositoryResponse)
async def get_repository(repository_id: int, db: Session = Depends(get_db)):
    """Get a specific repository."""
    repository = db.query(Repository).filter(Repository.id == repository_id).first()
    if not repository:
        raise HTTPException(status_code=404, detail="Repository not found")
    return repository


@router.put("/{repository_id}", response_model=RepositoryResponse)
async def update_repository(
    repository_id: int,
    repository_update: RepositoryUpdate,
    db: Session = Depends(get_db)
):
    """Update a repository."""
    repository = db.query(Repository).filter(Repository.id == repository_id).first()
    if not repository:
        raise HTTPException(status_code=404, detail="Repository not found")
    
    # Update fields
    for field, value in repository_update.dict(exclude_unset=True).items():
        setattr(repository, field, value)
    
    db.commit()
    db.refresh(repository)
    return repository


@router.delete("/{repository_id}")
async def delete_repository(repository_id: int, db: Session = Depends(get_db)):
    """Delete a repository (mark as inactive)."""
    repository = db.query(Repository).filter(Repository.id == repository_id).first()
    if not repository:
        raise HTTPException(status_code=404, detail="Repository not found")
    
    repository.is_active = False
    db.commit()
    return {"message": "Repository deleted successfully"}


@router.post("/{repository_id}/test", response_model=RepositoryStatus)
async def test_repository_connection(repository_id: int, db: Session = Depends(get_db)):
    """Test repository connection."""
    repository = db.query(Repository).filter(Repository.id == repository_id).first()
    if not repository:
        raise HTTPException(status_code=404, detail="Repository not found")
    
    borg_service = BorgService(db)
    status = await borg_service.test_repository_connection(repository)
    return status


@router.get("/{repository_id}/info")
async def get_repository_info(repository_id: int, db: Session = Depends(get_db)):
    """Get detailed repository information from Borg."""
    repository = db.query(Repository).filter(Repository.id == repository_id).first()
    if not repository:
        raise HTTPException(status_code=404, detail="Repository not found")
    
    borg_service = BorgService(db)
    info = await borg_service.get_repository_info(repository)
    return info


@router.post("/import", response_model=RepositoryImportResponse)
@router.post("/import/", response_model=RepositoryImportResponse)
async def import_repository(
    import_data: RepositoryImport,
    db: Session = Depends(get_db)
):
    """Import an existing Borg repository and all its archives."""
    
    # Check if repository with same name already exists
    existing_name = db.query(Repository).filter(Repository.name == import_data.name).first()
    if existing_name:
        raise HTTPException(
            status_code=400, 
            detail=f"Repository with name '{import_data.name}' already exists"
        )
    
    # Check if repository with same URL already exists
    existing_url = db.query(Repository).filter(Repository.url == import_data.url).first()
    if existing_url:
        raise HTTPException(
            status_code=400,
            detail=f"Repository at '{import_data.url}' is already registered as '{existing_url.name}'"
        )
    
    # Validate repository by running 'borg info'
    borg_service = BorgService(db)
    
    # Create a temporary repository object for validation
    temp_repo = Repository(
        name=import_data.name,
        url=import_data.url,
        repo_type=import_data.repo_type.value,
        passphrase=import_data.passphrase,
        ssh_key_path=import_data.ssh_key_path,
        ssh_password=import_data.ssh_password,
        ssh_auth_method=import_data.ssh_auth_method,
        remote_path=import_data.remote_path
    )
    
    try:
        # Validate and get repository info
        repo_info = await borg_service.get_repository_info(temp_repo)
        
        # Extract encryption mode from borg info
        encryption_mode = repo_info.get("encryption", {}).get("mode")
        
    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=f"Failed to access repository: {str(e)}"
        )
    
    # Create the repository in database
    db_repository = Repository(
        name=import_data.name,
        url=import_data.url,
        repo_type=import_data.repo_type.value,
        encryption_mode=encryption_mode,
        ssh_key_path=import_data.ssh_key_path,
        ssh_password=import_data.ssh_password,
        ssh_auth_method=import_data.ssh_auth_method,
        remote_path=import_data.remote_path,
        passphrase=import_data.passphrase,
        status="initialized"
    )
    
    db.add(db_repository)
    db.commit()
    db.refresh(db_repository)
    
    # Import all archives
    try:
        archives_result = await borg_service.list_archives(db_repository)
        
        if not archives_result.get("success"):
            raise Exception(archives_result.get("stderr", "Failed to list archives"))
        
        # Get the archives list from the JSON data
        archives_data = archives_result.get("data", {})
        archives_list = archives_data.get("archives", [])
        
        archive_names = []
        
        for archive_info in archives_list:
            # archive_info is a dict with keys: name, id, start, time, etc.
            archive_name = archive_info.get("name")
            
            if not archive_name:
                continue
                
            # Check if archive already exists
            existing_archive = db.query(Archive).filter(
                Archive.repository_id == db_repository.id,
                Archive.name == archive_name
            ).first()
            
            if not existing_archive:
                # Parse the datetime string from Borg
                start_time_str = archive_info.get("start")
                created_at = None
                if start_time_str:
                    try:
                        # Parse ISO format datetime: 2025-10-16T16:41:34.000000
                        created_at = datetime.fromisoformat(start_time_str.replace('Z', '+00:00'))
                    except (ValueError, AttributeError):
                        # If parsing fails, leave as None
                        pass
                
                # Create archive record
                archive = Archive(
                    repository_id=db_repository.id,
                    name=archive_name,
                    borg_id=archive_info.get("id"),
                    created_at=created_at,
                    comment=archive_info.get("comment", "")
                )
                db.add(archive)
                archive_names.append(archive.name)
        
        db.commit()
        
    except Exception as e:
        # If archive import fails, we still keep the repository
        # but log the error
        print(f"Warning: Failed to import some archives: {str(e)}")
        archive_names = []
    
    return RepositoryImportResponse(
        repository=RepositoryResponse.from_orm(db_repository),
        archives_imported=len(archive_names),
        archives=archive_names
    )