#!/usr/bin/env python3
"""
Migration to add passphrase column to repositories table.
This enables authentication for encrypted Borg repositories.
"""

import sys
import sqlite3
from pathlib import Path

def migrate_add_passphrase_column():
    """Add passphrase column to repositories table."""
    
    # Database path
    db_path = Path("/app/data/borgdash.db")
    
    if not db_path.exists():
        print("Database not found. This is normal for a fresh installation.")
        return True
    
    try:
        # Connect to database
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Check if passphrase column already exists
        cursor.execute("PRAGMA table_info(repositories)")
        columns = [column[1] for column in cursor.fetchall()]
        
        if 'passphrase' not in columns:
            print("Adding passphrase column to repositories table...")
            cursor.execute("ALTER TABLE repositories ADD COLUMN passphrase TEXT")
            conn.commit()
            print("Successfully added passphrase column.")
        else:
            print("Passphrase column already exists.")
        
        conn.close()
        return True
        
    except sqlite3.Error as e:
        print(f"Database error: {e}")
        return False
    except Exception as e:
        print(f"Error: {e}")
        return False

if __name__ == "__main__":
    success = migrate_add_passphrase_column()
    sys.exit(0 if success else 1)