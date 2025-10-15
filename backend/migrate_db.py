#!/usr/bin/env python3
"""
Simple migration script to add SSH authentication fields to repositories table.
This script can be run to upgrade existing BorgDash databases.
"""

import sqlite3
import sys
import os

def migrate_database(db_path: str = "/app/data/borgdash.db"):
    """Add new SSH authentication columns to repositories table."""
    
    print(f"Migrating database: {db_path}")
    
    # Check if database exists
    if not os.path.exists(db_path):
        print(f"Database not found at {db_path}")
        return False
    
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Check if columns already exist
        cursor.execute("PRAGMA table_info(repositories)")
        columns = [row[1] for row in cursor.fetchall()]
        
        migrations_needed = []
        
        if 'ssh_password' not in columns:
            migrations_needed.append("ALTER TABLE repositories ADD COLUMN ssh_password TEXT")
            
        if 'ssh_auth_method' not in columns:
            migrations_needed.append("ALTER TABLE repositories ADD COLUMN ssh_auth_method TEXT DEFAULT 'key'")
        
        if not migrations_needed:
            print("Database is already up to date!")
            return True
        
        # Run migrations
        for migration in migrations_needed:
            print(f"Running: {migration}")
            cursor.execute(migration)
        
        # Update existing SSH repositories to use 'key' auth method if they have ssh_key_path
        cursor.execute("""
            UPDATE repositories 
            SET ssh_auth_method = 'key' 
            WHERE repo_type = 'ssh' AND ssh_key_path IS NOT NULL AND ssh_key_path != ''
        """)
        
        conn.commit()
        conn.close()
        
        print("Migration completed successfully!")
        return True
        
    except Exception as e:
        print(f"Migration failed: {e}")
        return False

if __name__ == "__main__":
    db_path = sys.argv[1] if len(sys.argv) > 1 else "/app/data/borgdash.db"
    success = migrate_database(db_path)
    sys.exit(0 if success else 1)