from sqlalchemy import create_engine, MetaData
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os
import aiosqlite
from .config import settings

# Create SQLAlchemy engine
engine = create_engine(
    settings.DATABASE_URL,
    connect_args={"check_same_thread": False} if "sqlite" in settings.DATABASE_URL else {}
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


async def init_db():
    """Initialize the database with tables."""
    # Import models to ensure they're registered
    from .models.repository import Repository
    from .models.archive import Archive
    
    # Ensure data directory exists
    db_dir = os.path.dirname(settings.DATABASE_URL.replace("sqlite:///", "").replace("./", "/app/"))
    os.makedirs(db_dir, exist_ok=True)
    
    # Create tables
    Base.metadata.create_all(bind=engine)
    
    print("Database initialized successfully")


def get_db():
    """Dependency to get database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()