import { useState, useRef, useEffect } from 'react';
import { Send, Settings, Loader2 } from 'lucide-react';
import { useMCPClient } from '../hooks/useMCPClient';
import { useChatStore } from '../store/chat';
import { useConfigStore } from '../store/config';
import { ToolCallCard } from './ToolCallCard';

export function ChatInterface() {
  const [input, setInput] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [tempApiKey, setTempApiKey] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { sendMessage, isReady, isStreaming } = useMCPClient();
  const { messages, pendingToolCall } = useChatStore();
  const { openaiApiKey, setOpenAIApiKey, mcpServerUrl } = useConfigStore();

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, pendingToolCall]);

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

  const handleSaveSettings = () => {
    if (tempApiKey) {
      setOpenAIApiKey(tempApiKey);
      setShowSettings(false);
      setTempApiKey('');
    }
  };

  if (!openaiApiKey) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="bg-white p-8 rounded-xl shadow-lg max-w-md w-full">
          <div className="text-center mb-6">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Welcome to Expense Tracker</h2>
            <p className="text-gray-600">
              Please enter your OpenAI API key to get started.
            </p>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                OpenAI API Key
              </label>
              <input
                type="password"
                placeholder="sk-..."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={tempApiKey}
                onChange={(e) => setTempApiKey(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && tempApiKey) {
                    setOpenAIApiKey(tempApiKey);
                  }
                }}
              />
            </div>
            <button
              onClick={() => tempApiKey && setOpenAIApiKey(tempApiKey)}
              disabled={!tempApiKey}
              className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              Get Started
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4 flex items-center justify-between shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">💰 Expense Tracker</h1>
          <p className="text-sm text-gray-500">
            {isReady ? '🟢 Connected to MCP Server' : '🔴 Connecting...'}
          </p>
        </div>
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          title="Settings"
        >
          <Settings className="w-5 h-5 text-gray-600" />
        </button>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="bg-blue-50 border-b px-6 py-4">
          <h3 className="font-semibold text-gray-900 mb-3">Settings</h3>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                MCP Server URL
              </label>
              <input
                type="text"
                value={mcpServerUrl}
                disabled
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-600"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                OpenAI API Key
              </label>
              <div className="flex gap-2">
                <input
                  type="password"
                  placeholder="sk-..."
                  value={tempApiKey}
                  onChange={(e) => setTempApiKey(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={handleSaveSettings}
                  disabled={!tempApiKey}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  Update
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {messages.length === 0 && (
          <div className="text-center text-gray-500 mt-20">
            <div className="text-6xl mb-4">💬</div>
            <p className="text-xl font-medium mb-2">Welcome to Expense Tracker!</p>
            <p className="text-sm text-gray-400 mb-6">
              Manage your expenses with natural language
            </p>
            <div className="max-w-md mx-auto bg-white rounded-lg p-4 shadow-sm text-left">
              <p className="font-medium text-gray-900 mb-2">Try these commands:</p>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>• "Add $50 for groceries today"</li>
                <li>• "Show me expenses from this month"</li>
                <li>• "Summarize my food expenses"</li>
                <li>• "List expenses from January 1 to January 15"</li>
              </ul>
            </div>
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
                  : 'bg-white border border-gray-200 shadow-sm'
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

        {isStreaming && !pendingToolCall && (
          <div className="mb-4 flex items-center gap-2 text-gray-500">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm">Thinking...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="bg-white border-t px-6 py-4 shadow-lg">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a message... (e.g., Add $25 for lunch today)"
            className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={isStreaming || !isReady}
          />
          <button
            type="submit"
            disabled={isStreaming || !input.trim() || !isReady}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-medium transition-colors"
          >
            {isStreaming ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
            Send
          </button>
        </form>
      </div>
    </div>
  );
}
