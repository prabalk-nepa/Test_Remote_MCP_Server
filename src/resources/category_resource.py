from fastmcp import FastMCP
import json
import os


def register_category_resources(mcp: FastMCP):
    """Register category-related MCP resources"""

    @mcp.resource("expense:///categories", mime_type="application/json", description="List of expense categories and subcategories")
    def get_categories():
        """Get expense categories and subcategories"""
        try:
            categories_path = os.path.join(
                os.path.dirname(os.path.dirname(__file__)),
                "config",
                "categories.json"
            )

            with open(categories_path, "r", encoding="utf-8") as f:
                return f.read()

        except FileNotFoundError:
            # Return default categories if file not found
            default_categories = {
                "food": ["groceries", "dining_out", "coffee_tea", "snacks", "other"],
                "transport": ["fuel", "public_transport", "cab", "parking", "other"],
                "housing": ["rent", "maintenance", "repairs", "other"],
                "utilities": ["electricity", "water", "internet", "mobile", "other"],
                "health": ["medicines", "doctor", "fitness", "other"],
                "education": ["books", "courses", "other"],
                "entertainment": ["movies", "streaming", "games", "other"],
                "shopping": ["clothing", "electronics", "home_decor", "other"],
                "business": ["software", "hosting", "marketing", "other"],
                "misc": ["uncategorized", "other"]
            }
            return json.dumps(default_categories, indent=2)

        except Exception as e:
            return json.dumps({"error": f"Could not load categories: {str(e)}"})
