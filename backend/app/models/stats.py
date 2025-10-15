from pydantic import BaseModel
from typing import List, Dict, Any
from datetime import datetime


class RepositoryStats(BaseModel):
    """Repository statistics and information."""
    repository_id: int
    total_size: int
    compressed_size: int
    deduplicated_size: int
    total_archives: int
    total_files: int
    compression_ratio: float
    deduplication_ratio: float
    last_modified: datetime


class ArchiveStats(BaseModel):
    """Individual archive statistics."""
    archive_id: int
    original_size: int
    compressed_size: int
    deduplicated_size: int
    nfiles: int
    duration: int  # seconds
    compression_ratio: float
    files_per_second: float
    throughput_mb_per_second: float


class SystemStats(BaseModel):
    """Overall system statistics."""
    total_repositories: int
    total_archives: int
    total_original_size: int
    total_compressed_size: int
    total_deduplicated_size: int
    overall_compression_ratio: float
    overall_deduplication_ratio: float
    storage_efficiency: float


class DashboardStats(BaseModel):
    """Dashboard overview statistics."""
    repositories: List[RepositoryStats]
    system: SystemStats
    recent_archives: List[Dict[str, Any]]
    storage_trends: List[Dict[str, Any]]  # Time series data


class BackupTrend(BaseModel):
    """Backup frequency and size trends."""
    date: str  # ISO date string
    archives_created: int
    total_size: int
    compressed_size: int
    deduplicated_size: int


class StorageBreakdown(BaseModel):
    """Storage usage breakdown by repository."""
    repository_name: str
    repository_id: int
    size: int
    percentage: float
    archives_count: int