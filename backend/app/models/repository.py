from sqlalchemy import Column, Integer, String, DateTime, Text, Boolean
from pydantic import BaseModel, HttpUrl
from datetime import datetime
from typing import Optional, Dict, Any, List
from enum import Enum
import json

from ..database import Base


class RepositoryType(str, Enum):
    LOCAL = "local"
    SSH = "ssh"


class EncryptionMode(str, Enum):
    NONE = "none"
    AUTHENTICATED = "authenticated"  
    AUTHENTICATED_BLAKE2 = "authenticated-blake2"
    REPOKEY = "repokey"
    REPOKEY_BLAKE2 = "repokey-blake2"
    KEYFILE = "keyfile"
    KEYFILE_BLAKE2 = "keyfile-blake2"


# SQLAlchemy ORM Model
class Repository(Base):
    __tablename__ = "repositories"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True, nullable=False)
    url = Column(String, nullable=False)
    repo_type = Column(String, nullable=False)  # local, ssh
    encryption_mode = Column(String, nullable=True)
    ssh_key_path = Column(String, nullable=True)
    ssh_password = Column(String, nullable=True)  # Encrypted SSH password
    ssh_auth_method = Column(String, nullable=True, default="key")  # "key" or "password"
    remote_path = Column(String, nullable=True, default="borg-1.4")
    passphrase = Column(String, nullable=True)  # Repository passphrase (should be encrypted)
    last_backup = Column(DateTime, nullable=True)
    status = Column(String, nullable=True, default="pending")  # pending, initialized, error
    is_active = Column(Boolean, default=True)
    config = Column(Text, nullable=True)  # JSON config
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships (will be set up when Archive model is imported)
    
    @property
    def config_dict(self) -> Dict[str, Any]:
        """Get config as dictionary."""
        if self.config:
            try:
                return json.loads(self.config)
            except json.JSONDecodeError:
                return {}
        return {}
    
    @config_dict.setter
    def config_dict(self, value: Dict[str, Any]):
        """Set config from dictionary."""
        self.config = json.dumps(value) if value else "{}"


# Pydantic Models for API
class RepositoryBase(BaseModel):
    name: str
    url: str
    repo_type: RepositoryType
    encryption_mode: Optional[EncryptionMode] = None
    ssh_key_path: Optional[str] = None
    ssh_password: Optional[str] = None
    ssh_auth_method: Optional[str] = "key"  # "key" or "password"
    remote_path: str = "borg-1.4"
    config: Optional[Dict[str, Any]] = None


class RepositoryCreate(RepositoryBase):
    passphrase: Optional[str] = None  # For repository initialization


class RepositoryUpdate(BaseModel):
    name: Optional[str] = None
    ssh_key_path: Optional[str] = None
    ssh_password: Optional[str] = None
    ssh_auth_method: Optional[str] = None
    remote_path: Optional[str] = None
    passphrase: Optional[str] = None  # Repository passphrase
    is_active: Optional[bool] = None
    config: Optional[Dict[str, Any]] = None


class RepositoryResponse(BaseModel):
    id: int
    name: str
    url: str
    repo_type: RepositoryType
    encryption_mode: Optional[EncryptionMode] = None
    ssh_key_path: Optional[str] = None
    ssh_auth_method: Optional[str] = None
    remote_path: str = "borg-1.4"
    last_backup: Optional[datetime] = None
    status: Optional[str] = None
    is_active: bool
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class RepositoryStatus(BaseModel):
    id: int
    name: str
    status: str  # "connected", "unreachable", "error"
    message: Optional[str] = None
    last_checked: datetime


class RepositoryImport(BaseModel):
    """Model for importing an existing repository."""
    name: str  # Friendly name for the repository
    url: str  # Repository location (path or SSH URL)
    repo_type: RepositoryType
    passphrase: Optional[str] = None  # Repository passphrase if encrypted
    ssh_key_path: Optional[str] = None  # For SSH repositories
    ssh_password: Optional[str] = None  # For SSH password auth
    ssh_auth_method: Optional[str] = "key"  # "key" or "password"
    remote_path: str = "borg-1.4"  # Remote borg binary path


class RepositoryImportResponse(BaseModel):
    """Response after importing a repository."""
    repository: RepositoryResponse
    archives_imported: int
    archives: List[str]  # List of archive names imported