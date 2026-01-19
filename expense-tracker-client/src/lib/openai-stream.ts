import type { StreamEvent, Message } from './types';

export async function* streamChatCompletion(
  messages: Message[],
  tools: any[],
  apiKey: string
): AsyncGenerator<StreamEvent> {
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: messages.map(m => ({
          role: m.role,
          content: m.content
        })),
        tools,
        tool_choice: 'auto',
        stream: true
      })
    });

    if (!response.ok) {
      const error = await response.text();
      yield { type: 'error', error: `OpenAI API error: ${error}` };
      return;
    }

    const reader = response.body?.getReader();
    if (!reader) {
      yield { type: 'error', error: 'No response body' };
      return;
    }

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith('data: ')) continue;

        const data = trimmed.slice(6);
        if (data === '[DONE]') {
          yield { type: 'done' };
          return;
        }

        try {
          const parsed = JSON.parse(data);
          const delta = parsed.choices?.[0]?.delta;

          if (!delta) continue;

          // Handle content streaming
          if (delta.content) {
            yield { type: 'content', delta: delta.content };
          }

          // Handle tool calls
          if (delta.tool_calls) {
            for (const toolCall of delta.tool_calls) {
              yield {
                type: 'tool_call',
                toolCall: {
                  id: toolCall.id || `tool_${Date.now()}`,
                  name: toolCall.function?.name || '',
                  arguments: toolCall.function?.arguments
                    ? JSON.parse(toolCall.function.arguments)
                    : {},
                  status: 'pending'
                }
              };
            }
          }
        } catch (e) {
          console.error('Error parsing SSE data:', e);
        }
      }
    }

    yield { type: 'done' };
  } catch (error) {
    yield {
      type: 'error',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}
