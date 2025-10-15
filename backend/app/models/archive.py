from sqlalchemy import Column, Integer, String, DateTime, Text, BigInteger, ForeignKey
from sqlalchemy.orm import relationship
from pydantic import BaseModel
from datetime import datetime
from typing import Optional, Dict, Any, List

from ..database import Base


# SQLAlchemy ORM Model
class Archive(Base):
    __tablename__ = "archives"
    
    id = Column(Integer, primary_key=True, index=True)
    repository_id = Column(Integer, ForeignKey("repositories.id"), nullable=False)
    name = Column(String, nullable=False)
    borg_id = Column(String, unique=True, nullable=True)  # Borg archive ID (set after creation)
    start_time = Column(DateTime, nullable=True)
    end_time = Column(DateTime, nullable=True)
    duration = Column(Integer, nullable=True)  # seconds
    original_size = Column(BigInteger, nullable=True)
    compressed_size = Column(BigInteger, nullable=True)
    deduplicated_size = Column(BigInteger, nullable=True)
    nfiles = Column(Integer, nullable=True)
    hostname = Column(String, nullable=True)
    username = Column(String, nullable=True)
    comment = Column(Text, nullable=True)
    stats = Column(Text, nullable=True)  # JSON stats from borg
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationship (will be set up when Repository model is imported)


# Pydantic Models for API
class ArchiveBase(BaseModel):
    repository_id: int
    name: str
    comment: Optional[str] = None


class ArchiveCreate(ArchiveBase):
    paths: List[str]  # Paths to backup
    exclude_patterns: Optional[List[str]] = None
    compression: Optional[str] = "lz4"  # none, lz4, zlib, lzma, zstd
    checkpoint_interval: Optional[int] = 1800  # seconds


class ArchiveResponse(BaseModel):
    id: int
    repository_id: int
    name: str
    borg_id: Optional[str] = None
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    duration: Optional[int] = None
    original_size: Optional[int] = None
    compressed_size: Optional[int] = None
    deduplicated_size: Optional[int] = None
    nfiles: Optional[int] = None
    hostname: Optional[str] = None
    username: Optional[str] = None
    comment: Optional[str] = None
    created_at: datetime
    
    class Config:
        from_attributes = True


class ArchiveProgress(BaseModel):
    archive_name: str
    original_size: int
    compressed_size: int
    deduplicated_size: int
    nfiles: int
    path: Optional[str] = None
    time: float
    progress: float  # 0.0 to 1.0