"""
Simple HTTP API for expense tracker tools
"""
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Dict, Any, Optional

from src.config.settings import settings
from src.database.sqlite_client import db
from src.models.expense import Expense


# Initialize database
db.init_schema()
print("✓ Database schema initialized")

# Create FastAPI app
app = FastAPI(title="Expense Tracker HTTP API")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ToolCallRequest(BaseModel):
    name: str
    arguments: Dict[str, Any]


@app.get("/")
def read_root():
    return {"message": "Expense Tracker HTTP API", "status": "running"}


@app.post("/call_tool")
async def call_tool(request: ToolCallRequest):
    """Call a tool via HTTP"""
    try:
        tool_name = request.name
        args = request.arguments

        # Route to appropriate tool function
        if tool_name == "add_expense":
            result = await add_expense_impl(
                date=args.get("date"),
                amount=args.get("amount"),
                category=args.get("category"),
                subcategory=args.get("subcategory", ""),
                note=args.get("note", "")
            )
        elif tool_name == "list_expenses":
            result = await list_expenses_impl(
                start_date=args.get("start_date"),
                end_date=args.get("end_date"),
                category=args.get("category")
            )
        elif tool_name == "summarize_expenses":
            result = await summarize_expenses_impl(
                start_date=args.get("start_date"),
                end_date=args.get("end_date"),
                category=args.get("category")
            )
        else:
            raise HTTPException(status_code=404, detail=f"Tool '{tool_name}' not found")

        return {"success": True, "result": result}

    except Exception as e:
        return {"success": False, "error": str(e)}


async def add_expense_impl(date: str, amount: float, category: str, subcategory: str = "", note: str = ""):
    """Add expense implementation"""
    try:
        expense = Expense(date=date, amount=amount, category=category, subcategory=subcategory, note=note)
        result = await db.execute(
            "INSERT INTO expenses (date, amount, category, subcategory, note) VALUES (?, ?, ?, ?, ?)",
            (expense.date, expense.amount, expense.category, expense.subcategory, expense.note)
        )
        return {
            "status": "success",
            "expense_id": result.last_insert_rowid,
            "message": f"Expense of ${expense.amount:.2f} for {expense.category} added successfully"
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}


async def list_expenses_impl(start_date: str, end_date: str, category: Optional[str] = None):
    """List expenses implementation"""
    try:
        query = "SELECT id, date, amount, category, subcategory, note, created_at FROM expenses WHERE date BETWEEN ? AND ?"
        params = [start_date, end_date]

        if category:
            query += " AND category = ?"
            params.append(category)

        query += " ORDER BY date DESC, created_at DESC"

        expenses = await db.fetch_all(query, tuple(params))
        return expenses or []
    except Exception as e:
        return [{"status": "error", "message": str(e)}]


async def summarize_expenses_impl(start_date: str, end_date: str, category: Optional[str] = None):
    """Summarize expenses implementation"""
    try:
        query = """
            SELECT category, SUM(amount) as total_amount, COUNT(*) as count
            FROM expenses WHERE date BETWEEN ? AND ?
        """
        params = [start_date, end_date]

        if category:
            query += " AND category = ?"
            params.append(category)

        query += " GROUP BY category ORDER BY total_amount DESC"

        results = await db.fetch_all(query, tuple(params))
        total = sum(r['total_amount'] for r in results) if results else 0

        return {
            "summary": results,
            "total": round(total, 2),
            "period": f"{start_date} to {end_date}",
            "categories_count": len(results)
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}


if __name__ == "__main__":
    import uvicorn
    print(f"Starting HTTP server on {settings.mcp_server_host}:{settings.mcp_server_port}")
    uvicorn.run(
        app,
        host=settings.mcp_server_host,
        port=settings.mcp_server_port
    )
