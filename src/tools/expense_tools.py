from fastmcp import FastMCP
from src.database.sqlite_client import db
from src.models.expense import Expense, ExpenseSummary
from typing import List, Optional, Dict, Any


def register_expense_tools(mcp: FastMCP):
    """Register all expense-related MCP tools"""

    @mcp.tool()
    async def add_expense(
        date: str,
        amount: float,
        category: str,
        subcategory: str = "",
        note: str = ""
    ) -> Dict[str, Any]:
        """Add a new expense to the database.

        Args:
            date: Date in YYYY-MM-DD format
            amount: Expense amount (positive number)
            category: Main expense category
            subcategory: Optional subcategory
            note: Optional note or description

        Returns:
            Dictionary with status, expense_id, and message
        """
        try:
            # Validate with Pydantic model
            expense = Expense(
                date=date,
                amount=amount,
                category=category,
                subcategory=subcategory,
                note=note
            )

            # Insert into database
            result = await db.execute(
                """INSERT INTO expenses (date, amount, category, subcategory, note)
                   VALUES (?, ?, ?, ?, ?)""",
                (expense.date, expense.amount, expense.category, expense.subcategory, expense.note)
            )

            return {
                "status": "success",
                "expense_id": result.last_insert_rowid if hasattr(result, 'last_insert_rowid') else "created",
                "message": f"Expense of ${expense.amount:.2f} for {expense.category} added successfully"
            }

        except ValueError as e:
            return {"status": "error", "message": f"Validation error: {str(e)}"}
        except Exception as e:
            return {"status": "error", "message": f"Database error: {str(e)}"}

    @mcp.tool()
    async def list_expenses(
        start_date: str,
        end_date: str,
        category: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """List expenses within a date range, optionally filtered by category.

        Args:
            start_date: Start date in YYYY-MM-DD format
            end_date: End date in YYYY-MM-DD format
            category: Optional category filter

        Returns:
            List of expense dictionaries
        """
        try:
            query = """
                SELECT id, date, amount, category, subcategory, note, created_at
                FROM expenses
                WHERE date BETWEEN ? AND ?
            """
            params = [start_date, end_date]

            if category:
                query += " AND category = ?"
                params.append(category)

            query += " ORDER BY date DESC, created_at DESC"

            expenses = await db.fetch_all(query, tuple(params))

            return expenses if expenses else []

        except Exception as e:
            return [{"status": "error", "message": f"Error listing expenses: {str(e)}"}]

    @mcp.tool()
    async def summarize_expenses(
        start_date: str,
        end_date: str,
        category: Optional[str] = None
    ) -> Dict[str, Any]:
        """Get expense summary by category for a date range.

        Args:
            start_date: Start date in YYYY-MM-DD format
            end_date: End date in YYYY-MM-DD format
            category: Optional category filter for specific category summary

        Returns:
            Dictionary with summary data including totals by category
        """
        try:
            query = """
                SELECT
                    category,
                    SUM(amount) as total_amount,
                    COUNT(*) as count
                FROM expenses
                WHERE date BETWEEN ? AND ?
            """
            params = [start_date, end_date]

            if category:
                query += " AND category = ?"
                params.append(category)

            query += " GROUP BY category ORDER BY total_amount DESC"

            results = await db.fetch_all(query, tuple(params))

            # Calculate grand total
            total = sum(r['total_amount'] for r in results) if results else 0

            return {
                "summary": results,
                "total": round(total, 2),
                "period": f"{start_date} to {end_date}",
                "categories_count": len(results)
            }

        except Exception as e:
            return {"status": "error", "message": f"Error summarizing expenses: {str(e)}"}

    @mcp.tool()
    async def delete_expense(expense_id: str) -> Dict[str, Any]:
        """Delete an expense by its ID.

        Args:
            expense_id: The ID of the expense to delete

        Returns:
            Dictionary with status and message
        """
        try:
            result = await db.execute("DELETE FROM expenses WHERE id = ?", (expense_id,))

            if result.rows_affected > 0:
                return {
                    "status": "success",
                    "message": f"Expense {expense_id} deleted successfully"
                }
            else:
                return {
                    "status": "error",
                    "message": f"Expense {expense_id} not found"
                }

        except Exception as e:
            return {"status": "error", "message": f"Error deleting expense: {str(e)}"}

    @mcp.tool()
    async def update_expense(
        expense_id: str,
        date: Optional[str] = None,
        amount: Optional[float] = None,
        category: Optional[str] = None,
        subcategory: Optional[str] = None,
        note: Optional[str] = None
    ) -> Dict[str, Any]:
        """Update an existing expense.

        Args:
            expense_id: The ID of the expense to update
            date: New date (optional)
            amount: New amount (optional)
            category: New category (optional)
            subcategory: New subcategory (optional)
            note: New note (optional)

        Returns:
            Dictionary with status and message
        """
        try:
            # Build update query dynamically
            updates = []
            params = []

            if date is not None:
                updates.append("date = ?")
                params.append(date)
            if amount is not None:
                updates.append("amount = ?")
                params.append(amount)
            if category is not None:
                updates.append("category = ?")
                params.append(category)
            if subcategory is not None:
                updates.append("subcategory = ?")
                params.append(subcategory)
            if note is not None:
                updates.append("note = ?")
                params.append(note)

            if not updates:
                return {"status": "error", "message": "No fields to update"}

            updates.append("updated_at = datetime('now')")
            params.append(expense_id)

            query = f"UPDATE expenses SET {', '.join(updates)} WHERE id = ?"
            result = await db.execute(query, tuple(params))

            if result.rows_affected > 0:
                return {
                    "status": "success",
                    "message": f"Expense {expense_id} updated successfully"
                }
            else:
                return {
                    "status": "error",
                    "message": f"Expense {expense_id} not found"
                }

        except Exception as e:
            return {"status": "error", "message": f"Error updating expense: {str(e)}"}
