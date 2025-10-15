from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List

from ..database import get_db
from ..models.repository import Repository
from ..models.archive import Archive
from ..models.stats import (
    RepositoryStats, SystemStats, DashboardStats, 
    BackupTrend, StorageBreakdown
)

router = APIRouter()


@router.get("/dashboard", response_model=DashboardStats)
async def get_dashboard_stats(db: Session = Depends(get_db)):
    """Get comprehensive dashboard statistics."""
    
    # Repository stats
    repository_stats = []
    repositories = db.query(Repository).filter(Repository.is_active == True).all()
    
    for repo in repositories:
        archives = db.query(Archive).filter(Archive.repository_id == repo.id).all()
        
        total_original = sum(a.original_size or 0 for a in archives)
        total_compressed = sum(a.compressed_size or 0 for a in archives)
        total_deduplicated = sum(a.deduplicated_size or 0 for a in archives)
        total_files = sum(a.nfiles or 0 for a in archives)
        
        compression_ratio = (
            (total_original - total_compressed) / total_original * 100
            if total_original > 0 else 0.0
        )
        deduplication_ratio = (
            (total_compressed - total_deduplicated) / total_compressed * 100
            if total_compressed > 0 else 0.0
        )
        
        repo_stats = RepositoryStats(
            repository_id=repo.id,
            total_size=total_original,
            compressed_size=total_compressed,
            deduplicated_size=total_deduplicated,
            total_archives=len(archives),
            total_files=total_files,
            compression_ratio=compression_ratio,
            deduplication_ratio=deduplication_ratio,
            last_modified=repo.updated_at
        )
        repository_stats.append(repo_stats)
    
    # System stats
    total_repos = len(repositories)
    total_archives = db.query(Archive).count()
    
    system_totals = db.query(
        func.sum(Archive.original_size).label('total_original'),
        func.sum(Archive.compressed_size).label('total_compressed'),
        func.sum(Archive.deduplicated_size).label('total_deduplicated')
    ).first()
    
    total_original = system_totals.total_original or 0
    total_compressed = system_totals.total_compressed or 0
    total_deduplicated = system_totals.total_deduplicated or 0
    
    system_stats = SystemStats(
        total_repositories=total_repos,
        total_archives=total_archives,
        total_original_size=total_original,
        total_compressed_size=total_compressed,
        total_deduplicated_size=total_deduplicated,
        overall_compression_ratio=(
            (total_original - total_compressed) / total_original * 100
            if total_original > 0 else 0.0
        ),
        overall_deduplication_ratio=(
            (total_compressed - total_deduplicated) / total_compressed * 100
            if total_compressed > 0 else 0.0
        ),
        storage_efficiency=(
            (total_original - total_deduplicated) / total_original * 100
            if total_original > 0 else 0.0
        )
    )
    
    # Recent archives
    recent_archives = db.query(Archive).order_by(
        Archive.created_at.desc()
    ).limit(10).all()
    
    recent_archives_data = [
        {
            "id": a.id,
            "name": a.name,
            "repository_name": db.query(Repository).filter(Repository.id == a.repository_id).first().name,
            "created_at": a.created_at.isoformat(),
            "original_size": a.original_size,
            "deduplicated_size": a.deduplicated_size
        }
        for a in recent_archives
    ]
    
    return DashboardStats(
        repositories=repository_stats,
        system=system_stats,
        recent_archives=recent_archives_data,
        storage_trends=[]  # TODO: Implement storage trends
    )


@router.get("/repository/{repository_id}", response_model=RepositoryStats)
async def get_repository_stats(repository_id: int, db: Session = Depends(get_db)):
    """Get statistics for a specific repository."""
    repository = db.query(Repository).filter(Repository.id == repository_id).first()
    if not repository:
        raise HTTPException(status_code=404, detail="Repository not found")
    
    archives = db.query(Archive).filter(Archive.repository_id == repository_id).all()
    
    total_original = sum(a.original_size or 0 for a in archives)
    total_compressed = sum(a.compressed_size or 0 for a in archives)
    total_deduplicated = sum(a.deduplicated_size or 0 for a in archives)
    total_files = sum(a.nfiles or 0 for a in archives)
    
    return RepositoryStats(
        repository_id=repository_id,
        total_size=total_original,
        compressed_size=total_compressed,
        deduplicated_size=total_deduplicated,
        total_archives=len(archives),
        total_files=total_files,
        compression_ratio=(
            (total_original - total_compressed) / total_original * 100
            if total_original > 0 else 0.0
        ),
        deduplication_ratio=(
            (total_compressed - total_deduplicated) / total_compressed * 100
            if total_compressed > 0 else 0.0
        ),
        last_modified=repository.updated_at
    )


@router.get("/storage-breakdown", response_model=List[StorageBreakdown])
async def get_storage_breakdown(db: Session = Depends(get_db)):
    """Get storage usage breakdown by repository."""
    repositories = db.query(Repository).filter(Repository.is_active == True).all()
    
    total_system_size = 0
    breakdowns = []
    
    # Calculate sizes for each repository
    for repo in repositories:
        archives = db.query(Archive).filter(Archive.repository_id == repo.id).all()
        repo_size = sum(a.deduplicated_size or 0 for a in archives)
        total_system_size += repo_size
        
        breakdowns.append({
            'repository_name': repo.name,
            'repository_id': repo.id,
            'size': repo_size,
            'archives_count': len(archives),
            'percentage': 0.0  # Will calculate after we have total
        })
    
    # Calculate percentages
    for breakdown in breakdowns:
        breakdown['percentage'] = (
            breakdown['size'] / total_system_size * 100
            if total_system_size > 0 else 0.0
        )
    
    # Sort by size descending
    breakdowns.sort(key=lambda x: x['size'], reverse=True)
    
    return [StorageBreakdown(**bd) for bd in breakdowns]