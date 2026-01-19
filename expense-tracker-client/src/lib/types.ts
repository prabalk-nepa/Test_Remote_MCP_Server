// Message types
export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  toolCalls?: ToolCall[];
}

// Tool call types
export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, any>;
  status: 'pending' | 'approved' | 'executing' | 'completed' | 'rejected' | 'error';
  result?: any;
  error?: string;
}

// MCP Tool definition
export interface MCPTool {
  name: string;
  description: string;
  inputSchema: {
    type: string;
    properties: Record<string, any>;
    required?: string[];
  };
}

// OpenAI streaming events
export type StreamEvent =
  | { type: 'content'; delta: string }
  | { type: 'tool_call'; toolCall: Partial<ToolCall> }
  | { type: 'done' }
  | { type: 'error'; error: string };

// Expense types
export interface Expense {
  id: string;
  date: string;
  amount: number;
  category: string;
  subcategory?: string;
  note?: string;
  created_at?: string;
}

export interface ExpenseSummary {
  category: string;
  total_amount: number;
  count: number;
}
