import React from 'react';
import { RefreshCw } from 'lucide-react';

interface RefreshButtonProps {
  onRefresh: () => void;
  loading?: boolean;
  className?: string;
}

export function RefreshButton({ onRefresh, loading = false, className = '' }: RefreshButtonProps) {
  return (
    <div
      onClick={loading ? undefined : onRefresh}
      className={`inline-flex items-center gap-2 px-3 py-1.5 text-gray-700 hover:bg-gray-100 rounded-md transition-colors cursor-pointer ${
        loading ? 'opacity-50 cursor-not-allowed' : ''
      } ${className}`}
      title="Atualizar dados"
    >
      <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
      <span className="text-sm">Atualizar</span>
    </div>
  );
}