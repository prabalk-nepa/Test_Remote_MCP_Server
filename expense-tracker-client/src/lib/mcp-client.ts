// Hardcoded tool definitions for OpenAI (since we can't easily fetch from SSE server)
const MCP_TOOLS = [
  {
    type: 'function',
    function: {
      name: 'add_expense',
      description: 'Add a new expense to the database',
      parameters: {
        type: 'object',
        properties: {
          date: { type: 'string', description: 'Date in YYYY-MM-DD format' },
          amount: { type: 'number', description: 'Expense amount (positive number)' },
          category: { type: 'string', description: 'Main expense category' },
          subcategory: { type: 'string', description: 'Optional subcategory' },
          note: { type: 'string', description: 'Optional note or description' }
        },
        required: ['date', 'amount', 'category']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'list_expenses',
      description: 'List expenses within a date range, optionally filtered by category',
      parameters: {
        type: 'object',
        properties: {
          start_date: { type: 'string', description: 'Start date in YYYY-MM-DD format' },
          end_date: { type: 'string', description: 'End date in YYYY-MM-DD format' },
          category: { type: 'string', description: 'Optional category filter' }
        },
        required: ['start_date', 'end_date']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'summarize_expenses',
      description: 'Get expense summary by category for a date range',
      parameters: {
        type: 'object',
        properties: {
          start_date: { type: 'string', description: 'Start date in YYYY-MM-DD format' },
          end_date: { type: 'string', description: 'End date in YYYY-MM-DD format' },
          category: { type: 'string', description: 'Optional category filter' }
        },
        required: ['start_date', 'end_date']
      }
    }
  }
];

export class MCPClient {
  private serverUrl: string;

  constructor(serverUrl: string) {
    this.serverUrl = serverUrl;
  }

  /**
   * Call an MCP tool by making a direct HTTP POST request
   * Note: This is a simplified approach - calls the tool function directly via HTTP
   */
  async callTool(toolName: string, args: Record<string, any>): Promise<any> {
    try {
      console.log(`Calling tool: ${toolName}`, args);

      const response = await fetch(`${this.serverUrl}/call_tool`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: toolName,
          arguments: args
        })
      });

      if (!response.ok) {
        throw new Error(`MCP tool call failed: ${response.statusText}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Tool call failed');
      }

      return data.result;
    } catch (error) {
      console.error('MCP tool call error:', error);
      throw error;
    }
  }

  /**
   * Get OpenAI-compatible tool definitions
   */
  async getToolDefinitions(): Promise<any[]> {
    // Return hardcoded tool definitions
    return MCP_TOOLS;
  }
}
