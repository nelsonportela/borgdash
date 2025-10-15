from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List

from ..database import get_db
from ..models.repository import (
    Repository, RepositoryCreate, RepositoryUpdate, 
    RepositoryResponse, RepositoryStatus
)
from ..services.borg_service import BorgService

router = APIRouter()


@router.get("/", response_model=List[RepositoryResponse])
async def list_repositories(db: Session = Depends(get_db)):
    """List all repositories."""
    repositories = db.query(Repository).filter(Repository.is_active == True).all()
    return repositories


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