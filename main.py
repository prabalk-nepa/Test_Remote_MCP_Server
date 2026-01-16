from fastmcp import FastMCP
import os
import sqlite3

mcp = FastMCP("Expense_tracker_2_server")
DB_PATH = os.path.join(os.path.dirname(__file__), "expenses.db")
CATEGORIES_PATH = os.path.join(os.path.dirname(__file__), "categories.json")


def init_db():
    """Initialize the database and create the expenses table if it doesn't exist."""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS expenses (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            date TEXT NOT NULL,
            amount REAL NOT NULL,
            category TEXT NOT NULL,
            subcategory TEXT DEFAULT '',
            note TEXT DEFAULT ''
        )
    ''')
    conn.commit()
    conn.close()
    
init_db()

@mcp.tool()
def add_expense(amount:float , date,category, subcategory:str="",note=""):
    "Add a new expenses to the database"
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute('''
        INSERT INTO expenses (date, amount, category, subcategory, note)
        VALUES (?, ?, ?, ?, ?)
    ''', (date, amount, category, subcategory, note))
    conn.commit()
    conn.close()
    return {"status":"sucess","message":"Expense added successfully." , "id": cursor.lastrowid}

# create a mcp tool to list all the expenses in the database
@mcp.tool()
def list_expenses():
    "List all expenses in the database"
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM expenses')
    rows = cursor.fetchall()
    conn.close()
    expenses = []
    for row in rows:
        expenses.append({
            "id": row[0],
            "date": row[1],
            "amount": row[2],
            "category": row[3],
            "subcategory": row[4],
            "note": row[5]
        })
    return expenses

# mcp tool to get the summary of the expenses , either all or cateogory wise or date range wise
@mcp.tool()
def get_expense_summary(category: str = None, start_date: str = None, end_date: str = None):
    "Get the summary of expenses, optionally filtered by category or date range"
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    query = '''
        SELECT 
            SUM(amount) as total_amount,
            GROUP_CONCAT(DISTINCT category) as categories,
            MIN(date) as start_date,
            MAX(date) as end_date
        FROM expenses
        WHERE 1=1
    '''
    params = []
    if category:
        query += ' AND category = ?'
        params.append(category)
    if start_date:
        query += ' AND date >= ?'
        params.append(start_date)
    if end_date:
        query += ' AND date <= ?'
        params.append(end_date)
    cursor.execute(query, params)
    total = cursor.fetchone()[0]
    conn.close()
    return {"total_expense": total if total else 0}

# tool to delete an expense by id
@mcp.tool()
def delete_expense(expense_id: int):
    "Delete an expense by its ID"
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute('DELETE FROM expenses WHERE id = ?', (expense_id,))
    conn.commit()
    affected_rows = cursor.rowcount
    conn.close()
    if affected_rows == 0:
        return {"status":"failure","message":"Expense not found."}
    return {"status":"success","message":"Expense deleted successfully."}

# tool to update an expense by id
@mcp.tool()
def update_expense(expense_id: int, amount: float = None, date: str = None, category: str = None, subcategory: str = None, note: str = None):
    "Update an existing expense by its ID"
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    fields = []
    params = []
    if amount is not None:
        fields.append("amount = ?")
        params.append(amount)
    if date is not None:
        fields.append("date = ?")
        params.append(date)
    if category is not None:
        fields.append("category = ?")
        params.append(category)
    if subcategory is not None:
        fields.append("subcategory = ?")
        params.append(subcategory)
    if note is not None:
        fields.append("note = ?")
        params.append(note)
    params.append(expense_id)
    query = f'UPDATE expenses SET {", ".join(fields)} WHERE id = ?'
    cursor.execute(query, params)
    conn.commit()
    affected_rows = cursor.rowcount
    conn.close()
    if affected_rows == 0:
        return {"status":"failure","message":"Expense not found or no changes made."}
    return {"status":"success","message":"Expense updated successfully."}

# Resources for expense categories
@mcp.resource("expense://categories",mime_type="application/json",description="The list of expense categories and sub categories")
def categories():
    with open(CATEGORIES_PATH, "r") as f:
        return f.read()
        

# For local MCP Server
# if __name__== "__main__":
#     mcp.run()
    
# For deploying to FastMCP Cloud (Remote MCP SERVER)
if __name__== "__main__":
    mcp.run(transport="http",host="0.0.0.0",port=8000)