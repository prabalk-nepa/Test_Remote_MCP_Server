import aiosqlite
import sqlite3
import os
from typing import Any, List, Dict, Optional
from src.config.settings import settings


class SQLiteClient:
    """Async SQLite database client for expense tracker using aiosqlite"""

    def __init__(self):
        """Initialize SQLite client with database path from settings"""
        self.db_path = settings.database_path
        # Ensure database directory exists
        os.makedirs(os.path.dirname(self.db_path) if os.path.dirname(self.db_path) else '.', exist_ok=True)

    async def execute(self, query: str, params: Optional[tuple] = None) -> Any:
        """Execute a query asynchronously and return result info"""
        try:
            async with aiosqlite.connect(self.db_path) as conn:
                cursor = await conn.execute(query, params or ())
                await conn.commit()

                # Create result object with attributes
                class Result:
                    def __init__(self, lastrowid, rowcount):
                        self.last_insert_rowid = lastrowid
                        self.rows_affected = rowcount

                result = Result(cursor.lastrowid, cursor.rowcount)
                return result
        except Exception as e:
            raise Exception(f"Database error: {str(e)}")

    async def fetch_all(self, query: str, params: Optional[tuple] = None) -> List[Dict[str, Any]]:
        """Execute query asynchronously and return all results as list of dicts"""
        try:
            async with aiosqlite.connect(self.db_path) as conn:
                conn.row_factory = aiosqlite.Row
                cursor = await conn.execute(query, params or ())
                rows = await cursor.fetchall()

                # Convert Row objects to dictionaries
                results = [dict(row) for row in rows]
                return results
        except Exception as e:
            raise Exception(f"Database error: {str(e)}")

    async def fetch_one(self, query: str, params: Optional[tuple] = None) -> Optional[Dict[str, Any]]:
        """Execute query asynchronously and return first result as dict"""
        results = await self.fetch_all(query, params)
        return results[0] if results else None

    def init_schema(self):
        """Initialize database schema (synchronous for startup)"""
        schema_sql = """
        CREATE TABLE IF NOT EXISTS expenses (
            id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
            date TEXT NOT NULL,
            amount REAL NOT NULL,
            category TEXT NOT NULL,
            subcategory TEXT DEFAULT '',
            note TEXT DEFAULT '',
            created_at TEXT DEFAULT (datetime('now')),
            updated_at TEXT DEFAULT (datetime('now'))
        );

        CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date);
        CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category);
        """

        # Use synchronous sqlite3 for schema initialization
        conn = sqlite3.connect(self.db_path)
        conn.executescript(schema_sql)
        conn.commit()
        conn.close()


# Global database client instance
db = SQLiteClient()
