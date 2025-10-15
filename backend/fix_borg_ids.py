#!/usr/bin/env python3
"""
Script to fix archives with empty borg_id values.
This resolves the UNIQUE constraint issue by setting empty borg_ids to NULL.
"""

import sys
import sqlite3
from pathlib import Path

def fix_borg_ids():
    """Fix archives with empty borg_id values by setting them to NULL."""
    
    # Database path
    db_path = Path("/app/data/borgdash.db")
    
    if not db_path.exists():
        print("Database not found. This is normal for a fresh installation.")
        return True
    
    try:
        # Connect to database
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Check for archives with empty borg_id
        cursor.execute("SELECT id, name FROM archives WHERE borg_id = ''")
        empty_borg_ids = cursor.fetchall()
        
        if empty_borg_ids:
            print(f"Found {len(empty_borg_ids)} archives with empty borg_id:")
            for archive_id, name in empty_borg_ids:
                print(f"  - Archive {archive_id}: {name}")
            
            # Update empty borg_ids to NULL
            cursor.execute("UPDATE archives SET borg_id = NULL WHERE borg_id = ''")
            updated_count = cursor.rowcount
            
            # Commit changes
            conn.commit()
            print(f"Successfully updated {updated_count} archives.")
        else:
            print("No archives with empty borg_id found.")
        
        conn.close()
        return True
        
    except sqlite3.Error as e:
        print(f"Database error: {e}")
        return False
    except Exception as e:
        print(f"Error: {e}")
        return False

if __name__ == "__main__":
    success = fix_borg_ids()
    sys.exit(0 if success else 1)