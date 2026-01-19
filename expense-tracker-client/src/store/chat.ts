import { create } from 'zustand';
import type { Message, ToolCall } from '../lib/types';

interface ChatState {
  messages: Message[];
  pendingToolCall: ToolCall | null;
  isStreaming: boolean;
  currentStreamingContent: string;

  addMessage: (message: Message) => void;
  updateLastMessage: (content: string) => void;
  appendToLastMessage: (delta: string) => void;
  setPendingToolCall: (toolCall: ToolCall | null) => void;
  updateToolCallStatus: (id: string, status: ToolCall['status'], result?: any, error?: string) => void;
  setStreaming: (isStreaming: boolean) => void;
  clearMessages: () => void;
}

export const useChatStore = create<ChatState>((set) => ({
  messages: [],
  pendingToolCall: null,
  isStreaming: false,
  currentStreamingContent: '',

  addMessage: (message) =>
    set((state) => ({
      messages: [...state.messages, message]
    })),

  updateLastMessage: (content) =>
    set((state) => ({
      messages: state.messages.map((msg, idx) =>
        idx === state.messages.length - 1
          ? { ...msg, content }
          : msg
      )
    })),

  appendToLastMessage: (delta) =>
    set((state) => {
      const newMessages = [...state.messages];
      if (newMessages.length > 0) {
        const lastMsg = newMessages[newMessages.length - 1];
        newMessages[newMessages.length - 1] = {
          ...lastMsg,
          content: lastMsg.content + delta
        };
      }
      return { messages: newMessages };
    }),

  setPendingToolCall: (toolCall) =>
    set({ pendingToolCall: toolCall }),

  updateToolCallStatus: (id, status, result, error) =>
    set((state) => ({
      messages: state.messages.map((msg) => ({
        ...msg,
        toolCalls: msg.toolCalls?.map((tc) =>
          tc.id === id
            ? { ...tc, status, result, error }
            : tc
        )
      }))
    })),

  setStreaming: (isStreaming) =>
    set({ isStreaming }),

  clearMessages: () =>
    set({ messages: [], pendingToolCall: null, isStreaming: false })
}));
