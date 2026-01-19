import { Check, X, Loader2, AlertCircle } from 'lucide-react';
import type { ToolCall } from '../lib/types';

interface ToolCallCardProps {
  toolCall: ToolCall;
  onApprove: () => void;
  onReject: () => void;
}

export function ToolCallCard({ toolCall, onApprove, onReject }: ToolCallCardProps) {
  const formatArguments = (args: Record<string, any>) => {
    return Object.entries(args).map(([key, value]) => (
      <div key={key} className="flex gap-2">
        <span className="font-medium text-gray-700">{key}:</span>
        <span className="text-gray-900">
          {typeof value === 'object' ? JSON.stringify(value) : String(value)}
        </span>
      </div>
    ));
  };

  const getStatusBadge = () => {
    switch (toolCall.status) {
      case 'pending':
        return <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-xs font-medium">Awaiting Approval</span>;
      case 'approved':
        return <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium">Approved</span>;
      case 'executing':
        return <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium flex items-center gap-1">
          <Loader2 className="w-3 h-3 animate-spin" />
          Executing...
        </span>;
      case 'completed':
        return <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-medium flex items-center gap-1">
          <Check className="w-3 h-3" />
          Completed
        </span>;
      case 'rejected':
        return <span className="px-2 py-1 bg-red-100 text-red-800 rounded text-xs font-medium">Rejected</span>;
      case 'error':
        return <span className="px-2 py-1 bg-red-100 text-red-800 rounded text-xs font-medium flex items-center gap-1">
          <AlertCircle className="w-3 h-3" />
          Error
        </span>;
    }
  };

  return (
    <div className="border border-gray-200 rounded-lg p-4 my-3 bg-white shadow-sm">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-500 rounded flex items-center justify-center text-white font-bold text-sm">
            🛠️
          </div>
          <div>
            <div className="font-semibold text-gray-900">{toolCall.name}</div>
            <div className="text-xs text-gray-500">Tool Call</div>
          </div>
        </div>
        {getStatusBadge()}
      </div>

      <div className="bg-gray-50 rounded p-3 mb-3 text-sm">
        <div className="font-medium text-gray-700 mb-2">Arguments:</div>
        <div className="space-y-1">
          {formatArguments(toolCall.arguments)}
        </div>
      </div>

      {toolCall.status === 'pending' && (
        <div className="flex gap-2">
          <button
            onClick={onApprove}
            className="flex-1 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2 transition-colors"
          >
            <Check className="w-4 h-4" />
            Approve
          </button>
          <button
            onClick={onReject}
            className="flex-1 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2 transition-colors"
          >
            <X className="w-4 h-4" />
            Reject
          </button>
        </div>
      )}

      {toolCall.status === 'completed' && toolCall.result && (
        <div className="bg-green-50 border border-green-200 rounded p-3 text-sm">
          <div className="font-medium text-green-900 mb-1">Result:</div>
          <pre className="text-green-800 whitespace-pre-wrap">
            {typeof toolCall.result === 'object'
              ? JSON.stringify(toolCall.result, null, 2)
              : String(toolCall.result)}
          </pre>
        </div>
      )}

      {toolCall.status === 'error' && toolCall.error && (
        <div className="bg-red-50 border border-red-200 rounded p-3 text-sm">
          <div className="font-medium text-red-900 mb-1">Error:</div>
          <div className="text-red-800">{toolCall.error}</div>
        </div>
      )}

      {toolCall.status === 'rejected' && (
        <div className="bg-gray-50 border border-gray-200 rounded p-3 text-sm text-gray-600">
          This tool call was rejected and will not be executed.
        </div>
      )}
    </div>
  );
}
