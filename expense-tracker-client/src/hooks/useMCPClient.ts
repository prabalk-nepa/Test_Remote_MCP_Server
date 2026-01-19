import { useState, useCallback, useEffect } from 'react';
import { MCPClient } from '../lib/mcp-client';
import { streamChatCompletion } from '../lib/openai-stream';
import { useChatStore } from '../store/chat';
import { useConfigStore } from '../store/config';
import type { Message, ToolCall } from '../lib/types';

export function useMCPClient() {
  const { openaiApiKey, mcpServerUrl } = useConfigStore();
  const {
    messages,
    addMessage,
    appendToLastMessage,
    setPendingToolCall,
    updateToolCallStatus,
    setStreaming,
    isStreaming
  } = useChatStore();

  const [mcpClient] = useState(() => new MCPClient(mcpServerUrl));
  const [tools, setTools] = useState<any[]>([]);
  const [isReady, setIsReady] = useState(false);

  // Load MCP tools on mount
  const loadTools = useCallback(async () => {
    try {
      console.log('Loading MCP tools...');
      const toolDefs = await mcpClient.getToolDefinitions();
      console.log('Loaded tools:', toolDefs);
      setTools(toolDefs);
      setIsReady(true);
    } catch (error) {
      console.error('Error loading tools:', error);
      setIsReady(false);
    }
  }, [mcpClient]);

  useEffect(() => {
    loadTools();
  }, [loadTools]);

  const sendMessage = useCallback(async (userMessage: string) => {
    if (!openaiApiKey || !isReady) {
      console.error('Not ready to send message');
      return;
    }

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

          console.log('Tool call detected:', toolCall);
          setPendingToolCall(toolCall);

          // Wait for user approval
          const approved = await new Promise<boolean>((resolve) => {
            const approveHandler = () => {
              window.removeEventListener('tool-approved', approveHandler);
              window.removeEventListener('tool-rejected', rejectHandler);
              resolve(true);
            };
            const rejectHandler = () => {
              window.removeEventListener('tool-approved', approveHandler);
              window.removeEventListener('tool-rejected', rejectHandler);
              resolve(false);
            };

            window.addEventListener('tool-approved', approveHandler);
            window.addEventListener('tool-rejected', rejectHandler);
          });

          if (approved) {
            updateToolCallStatus(toolCall.id, 'executing');

            try {
              console.log('Executing tool:', toolCall.name, toolCall.arguments);
              const result = await mcpClient.callTool(
                toolCall.name,
                toolCall.arguments
              );

              console.log('Tool result:', result);
              updateToolCallStatus(toolCall.id, 'completed', result);

              // Add result to message
              const resultText = typeof result === 'object'
                ? JSON.stringify(result, null, 2)
                : String(result);
              appendToLastMessage(`\n\n✓ Tool executed: ${resultText}`);
            } catch (error) {
              console.error('Tool execution error:', error);
              updateToolCallStatus(
                toolCall.id,
                'error',
                undefined,
                error instanceof Error ? error.message : 'Unknown error'
              );
              appendToLastMessage(`\n\n✗ Tool execution failed: ${error}`);
            }
          } else {
            updateToolCallStatus(toolCall.id, 'rejected');
            appendToLastMessage(`\n\n⚠️ Tool call rejected by user`);
          }

          setPendingToolCall(null);
        } else if (event.type === 'error') {
          appendToLastMessage(`\n\n❌ Error: ${event.error}`);
        }
      }
    } catch (error) {
      console.error('Streaming error:', error);
      appendToLastMessage(`\n\n❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setStreaming(false);
    }
  }, [messages, tools, openaiApiKey, isReady, mcpClient, addMessage, appendToLastMessage, setPendingToolCall, updateToolCallStatus, setStreaming]);

  return {
    messages,
    sendMessage,
    loadTools,
    isReady,
    isStreaming
  };
}
