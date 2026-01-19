import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ConfigState {
  openaiApiKey: string;
  mcpServerUrl: string;
  setOpenAIApiKey: (key: string) => void;
  setMCPServerUrl: (url: string) => void;
}

export const useConfigStore = create<ConfigState>()(
  persist(
    (set) => ({
      openaiApiKey: import.meta.env.VITE_OPENAI_API_KEY || '',
      mcpServerUrl: import.meta.env.VITE_MCP_SERVER_URL || 'http://localhost:3001',

      setOpenAIApiKey: (key) => set({ openaiApiKey: key }),
      setMCPServerUrl: (url) => set({ mcpServerUrl: url }),
    }),
    {
      name: 'expense-tracker-config'
    }
  )
);
