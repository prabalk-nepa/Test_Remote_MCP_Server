# 🚀 Quick Start Guide

## Prerequisites
- Python 3.11+
- Node.js 18+
- OpenAI API key ([Get one here](https://platform.openai.com/api-keys))

## Step 1: Start MCP Server

```bash
cd fast_mcp_initials

# Install dependencies (if not already done)
uv sync

# Run server
uv run python -m src.server
```

Expected output:
```
Starting Expense Tracker MCP Server...
Environment: development
Database: expenses.db
✓ Database schema initialized successfully
✓ Registered MCP tools and resources
Starting server on 0.0.0.0:3001
```

## Step 2: Start React Client

Open a **new terminal**:

```bash
cd expense-tracker-client

# Add your OpenAI API key
# Edit .env.local and add: VITE_OPENAI_API_KEY=sk-your-key-here

# Start client
npm run dev
```

Open http://localhost:5173

## Step 3: Enter API Key

On first launch, you'll be prompted to enter your OpenAI API key.
Paste your key (it starts with `sk-`) and click "Get Started".

## Step 4: Try It Out!

Type natural language commands:

### Add an expense:
```
Add $50 for groceries today
```

### List expenses:
```
Show me expenses from 2026-01-01 to 2026-01-15
```

### Summarize:
```
Summarize my expenses for this month
```

## How It Works

1. **You type** a natural language command
2. **OpenAI GPT-4** understands and suggests a tool call
3. **Tool approval UI appears** - you see what will be done
4. **You approve or reject** the operation
5. **MCP server executes** the tool
6. **Results displayed** in the chat

## Tool Approval Example

When you say "Add $50 for groceries today", you'll see:

```
🛠️ add_expense
Arguments:
  date: 2026-01-16
  amount: 50.0
  category: food
  subcategory: groceries

[Approve] [Reject]
```

Click **Approve** to add the expense!

## Troubleshooting

### Server won't start?
- Check if port 3001 is free
- Run `uv sync` to install dependencies

### Client can't connect?
- Make sure MCP server is running (Terminal 1)
- Check that `VITE_MCP_SERVER_URL=http://localhost:3001` in `.env.local`

### No tools appearing?
- Restart the MCP server
- Check browser console for errors
- Verify OpenAI API key is valid

## Available Categories

food, transport, housing, utilities, health, education, family_kids, entertainment, shopping, subscriptions, personal_care, gifts_donations, finance_fees, business, travel, home, pet, taxes, investments, misc

See `src/config/categories.json` for subcategories.

## Next Steps

- Try different expense categories
- List expenses from different date ranges
- Get summaries by category
- Update or delete expenses

Enjoy tracking your expenses! 💰
