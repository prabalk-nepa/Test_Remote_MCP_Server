# Expense Tracker with MCP Server and React Client - Implementation Guide

## Project Structure

### MCP Server (FastMCP + Turso)
```
fast_mcp_initials/
├── src/
│   ├── config/
│   │   ├── settings.py          ✅ Created - Pydantic settings
│   │   └── categories.json      ✅ Moved from root
│   ├── database/
│   │   └── turso_client.py      ✅ Created - Turso database client
│   ├── models/
│   │   └── expense.py           ✅ Created - Pydantic models
│   ├── tools/
│   │   └── expense_tools.py     ✅ Created - MCP tools (add, list, summarize, delete, update)
│   ├── resources/
│   │   └── category_resource.py ✅ Created - Category resource
│   └── server.py                ✅ Created - Main server entry point
├── pyproject.toml               ✅ Updated with new dependencies
├── .env.example                 ✅ Created
└── main.py                      ⚠️  Old file - can be archived
```

### React Client (Vite + TypeScript + Tailwind)
```
expense-tracker-client/
├── src/
│   ├── lib/
│   │   ├── types.ts             ✅ Created - TypeScript interfaces
│   │   ├── mcp-client.ts        ✅ Created - MCP protocol client
│   │   └── openai-stream.ts     ✅ Created - OpenAI streaming handler
│   ├── store/
│   │   ├── chat.ts              ✅ Created - Zustand chat state
│   │   └── config.ts            ✅ Created - Zustand config state
│   ├── components/
│   │   └── ToolCallCard.tsx     ✅ Created - Tool approval UI
│   ├── hooks/                   ⏳ Need to create
│   ├── App.tsx                  ⏳ Need to update
│   └── index.css                ✅ Updated with Tailwind
├── tailwind.config.js           ✅ Created
├── postcss.config.js            ✅ Created
└── package.json                 ✅ Dependencies installed
```

## Setup Instructions

### 1. Setup Turso Database

**Create Turso account and database:**
```bash
# Install Turso CLI
curl -sSfL https://get.tur.so/install.sh | bash

# Login
turso auth login

# Create database
turso db create expense-tracker

# Get database URL
turso db show expense-tracker --url

# Create auth token
turso db tokens create expense-tracker
```

**Create `.env` file in server root:**
```bash
cd fast_mcp_initials
cp .env.example .env
```

Edit `.env` and add your Turso credentials:
```env
TURSO_DATABASE_URL=libsql://expense-tracker-<your-username>.turso.io
TURSO_AUTH_TOKEN=<your-auth-token>

MCP_SERVER_HOST=0.0.0.0
MCP_SERVER_PORT=3001
MCP_TRANSPORT=sse

ENVIRONMENT=development
LOG_LEVEL=INFO
```

### 2. Install Server Dependencies

```bash
cd fast_mcp_initials
uv sync
```

### 3. Run MCP Server

```bash
# Using uv
uv run python -m src.server

# Or activate venv first
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
python -m src.server
```

Expected output:
```
Starting Expense Tracker MCP Server...
Environment: development
Database: libsql://expense-tracker-xxx.turso.io
✓ Database schema initialized successfully
✓ Registered MCP tools and resources
Starting server on 0.0.0.0:3001
```

### 4. Test MCP Server with Inspector

```bash
# In another terminal
uv run fastmcp dev src/server.py
```

This will open MCP Inspector in your browser. You should see 6 tools:
- `add_expense`
- `list_expenses`
- `summarize_expenses`
- `delete_expense`
- `update_expense`

And 1 resource:
- `expense:///categories`

### 5. Setup React Client

**Create `.env.local` in client directory:**
```bash
cd expense-tracker-client
```

Create `.env.local`:
```env
VITE_OPENAI_API_KEY=sk-your-openai-api-key-here
VITE_MCP_SERVER_URL=http://localhost:3001
```

**Install dependencies (already done):**
```bash
npm install
```

### 6. Complete React Client Implementation

You need to create these remaining files:

#### `src/hooks/useMCPClient.ts`
```typescript
import { useState, useCallback } from 'react';
import { MCPClient } from '../lib/mcp-client';
import { streamChatCompletion } from '../lib/openai-stream';
import { useChatStore } from '../store/chat';
import { useConfigStore } from '../store/config';
import { Message, ToolCall } from '../lib/types';

export function useMCPClient() {
  const { openaiApiKey, mcpServerUrl } = useConfigStore();
  const {
    messages,
    addMessage,
    appendToLastMessage,
    setPendingToolCall,
    updateToolCallStatus,
    setStreaming
  } = useChatStore();

  const [mcpClient] = useState(() => new MCPClient(mcpServerUrl));
  const [tools, setTools] = useState<any[]>([]);

  // Load MCP tools on mount
  const loadTools = useCallback(async () => {
    const toolDefs = await mcpClient.getToolDefinitions();
    setTools(toolDefs);
  }, [mcpClient]);

  const sendMessage = useCallback(async (userMessage: string) => {
    // Add user message
    const userMsg: Message = {
      id: `msg_${Date.now()}`,
      role: 'user',
      content: userMessage,
      timestamp: new Date()
    };
    addMessage(userMsg);

    // Add empty assistant message for streaming
    const assistantMsg: Message = {
      id: `msg_${Date.now() + 1}`,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      toolCalls: []
    };
    addMessage(assistantMsg);

    setStreaming(true);

    try {
      // Stream OpenAI response
      const stream = streamChatCompletion(
        [...messages, userMsg],
        tools,
        openaiApiKey
      );

      for await (const event of stream) {
        if (event.type === 'content') {
          appendToLastMessage(event.delta);
        } else if (event.type === 'tool_call') {
          const toolCall: ToolCall = {
            id: event.toolCall.id || `tool_${Date.now()}`,
            name: event.toolCall.name || '',
            arguments: event.toolCall.arguments || {},
            status: 'pending'
          };

          setPendingToolCall(toolCall);

          // Wait for user approval
          const approved = await new Promise<boolean>((resolve) => {
            // This will be resolved by approve/reject buttons
            window.addEventListener('tool-approved', () => resolve(true), { once: true });
            window.addEventListener('tool-rejected', () => resolve(false), { once: true });
          });

          if (approved) {
            updateToolCallStatus(toolCall.id, 'executing');

            try {
              const result = await mcpClient.callTool(
                toolCall.name,
                toolCall.arguments
              );

              updateToolCallStatus(toolCall.id, 'completed', result);
              appendToLastMessage(`\n\nTool executed successfully: ${JSON.stringify(result)}`);
            } catch (error) {
              updateToolCallStatus(
                toolCall.id,
                'error',
                undefined,
                error instanceof Error ? error.message : 'Unknown error'
              );
            }
          } else {
            updateToolCallStatus(toolCall.id, 'rejected');
          }

          setPendingToolCall(null);
        } else if (event.type === 'error') {
          appendToLastMessage(`\n\nError: ${event.error}`);
        }
      }
    } finally {
      setStreaming(false);
    }
  }, [messages, tools, openaiApiKey, mcpClient, addMessage, appendToLastMessage, setPendingToolCall, updateToolCallStatus, setStreaming]);

  return {
    messages,
    sendMessage,
    loadTools,
    isReady: tools.length > 0
  };
}
```

#### `src/components/ChatInterface.tsx`
```typescript
import { useState, useEffect } from 'react';
import { Send, Settings } from 'lucide-react';
import { useMCPClient } from '../hooks/useMCPClient';
import { useChatStore } from '../store/chat';
import { useConfigStore } from '../store/config';
import { ToolCallCard } from './ToolCallCard';

export function ChatInterface() {
  const [input, setInput] = useState('');
  const { sendMessage, loadTools, isReady } = useMCPClient();
  const { messages, pendingToolCall, isStreaming } = useChatStore();
  const { openaiApiKey, setOpenAIApiKey } = useConfigStore();
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    loadTools();
  }, [loadTools]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isStreaming) return;

    await sendMessage(input);
    setInput('');
  };

  const handleApprove = () => {
    window.dispatchEvent(new Event('tool-approved'));
  };

  const handleReject = () => {
    window.dispatchEvent(new Event('tool-rejected'));
  };

  if (!openaiApiKey) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full">
          <h2 className="text-2xl font-bold mb-4">Setup Required</h2>
          <p className="text-gray-600 mb-4">
            Please enter your OpenAI API key to get started.
          </p>
          <input
            type="password"
            placeholder="sk-..."
            className="w-full px-4 py-2 border rounded-lg mb-4"
            onChange={(e) => setOpenAIApiKey(e.target.value)}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Expense Tracker</h1>
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="p-2 hover:bg-gray-100 rounded-lg"
        >
          <Settings className="w-5 h-5" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {messages.length === 0 && (
          <div className="text-center text-gray-500 mt-20">
            <p className="text-lg mb-2">Welcome to Expense Tracker!</p>
            <p className="text-sm">
              Try saying: "Add $50 for groceries today" or "Show me expenses from this month"
            </p>
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={`mb-4 ${
              message.role === 'user' ? 'flex justify-end' : ''
            }`}
          >
            <div
              className={`max-w-3xl rounded-lg px-4 py-3 ${
                message.role === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white border border-gray-200'
              }`}
            >
              <div className="whitespace-pre-wrap">{message.content}</div>

              {message.toolCalls?.map((toolCall) => (
                <ToolCallCard
                  key={toolCall.id}
                  toolCall={toolCall}
                  onApprove={handleApprove}
                  onReject={handleReject}
                />
              ))}
            </div>
          </div>
        ))}

        {pendingToolCall && (
          <div className="mb-4">
            <ToolCallCard
              toolCall={pendingToolCall}
              onApprove={handleApprove}
              onReject={handleReject}
            />
          </div>
        )}
      </div>

      {/* Input */}
      <div className="bg-white border-t px-6 py-4">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a message... (e.g., Add $25 for lunch today)"
            className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isStreaming}
          />
          <button
            type="submit"
            disabled={isStreaming || !input.trim()}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Send className="w-5 h-5" />
            Send
          </button>
        </form>
      </div>
    </div>
  );
}
```

#### Update `src/App.tsx`
```typescript
import { ChatInterface } from './components/ChatInterface';

function App() {
  return <ChatInterface />;
}

export default App;
```

### 7. Run the Application

**Terminal 1 - MCP Server:**
```bash
cd fast_mcp_initials
uv run python -m src.server
```

**Terminal 2 - React Client:**
```bash
cd expense-tracker-client
npm run dev
```

Open http://localhost:5173 in your browser.

## Usage Examples

Once running, try these commands in the chat interface:

1. **Add expense:**
   - "Add $50 for groceries today"
   - "I spent $25.50 on coffee at Starbucks on 2026-01-15"

2. **List expenses:**
   - "Show me all expenses from this month"
   - "List expenses from 2026-01-01 to 2026-01-15"

3. **Summarize:**
   - "Summarize my expenses for January 2026"
   - "What did I spend on food this month?"

## Features Implemented

✅ Modular MCP server structure
✅ Turso database integration (cloud-ready)
✅ Pydantic models with validation
✅ 5 MCP tools (add, list, summarize, delete, update)
✅ Category resource
✅ React + Vite + TypeScript client
✅ Tailwind CSS styling
✅ OpenAI GPT-4 integration
✅ Streaming responses
✅ Tool approval UI (Claude Desktop-style)
✅ Zustand state management
✅ MCP protocol client

## Deployment

### Deploy MCP Server to FastMCP Cloud

1. Update `src/server.py` to use environment variables
2. Deploy:
```bash
fastmcp deploy src/server.py
```

3. Update client `.env.local` with deployed URL

### Deploy React Client to Vercel

```bash
cd expense-tracker-client
npm run build
vercel
```

## Troubleshooting

**MCP Server won't start:**
- Check Turso credentials in `.env`
- Ensure database URL is correct
- Verify port 3001 is available

**React client can't connect:**
- Ensure MCP server is running
- Check `VITE_MCP_SERVER_URL` in `.env.local`
- Verify CORS is enabled on server

**Tool calls not working:**
- Check OpenAI API key
- Verify MCP server tools are loaded
- Check browser console for errors

## Next Steps

- Add expense visualization charts
- Implement budgeting features
- Add receipt OCR
- Create mobile app
- Add multi-user support
