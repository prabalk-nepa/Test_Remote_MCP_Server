from fastmcp import FastMCP
from src.config.settings import settings
from src.database.sqlite_client import db
from src.tools.expense_tools import register_expense_tools
from src.resources.category_resource import register_category_resources


# Initialize FastMCP server
mcp = FastMCP("ExpenseTracker")


def init_database():
    """Initialize database schema"""
    try:
        db.init_schema()
        print("✓ Database schema initialized successfully")
    except Exception as e:
        print(f"✗ Database initialization error: {e}")
        raise


def main():
    """Main server entry point"""
    print(f"Starting Expense Tracker MCP Server...")
    print(f"Environment: {settings.environment}")
    print(f"Database: {settings.database_path}")

    # Initialize database
    init_database()

    # Register tools and resources
    register_expense_tools(mcp)
    register_category_resources(mcp)

    print(f"✓ Registered MCP tools and resources")

    # Start server
    print(f"Starting server on {settings.mcp_server_host}:{settings.mcp_server_port}")
    mcp.run(
        transport=settings.mcp_transport,
        host=settings.mcp_server_host,
        port=settings.mcp_server_port
    )


if __name__ == "__main__":
    main()
