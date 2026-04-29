'use client';

import { useRef, useEffect } from 'react';

interface NegotiationEntry {
  id: string;
  timestamp: number;
  type: 'decomposition' | 'rfq' | 'selection' | 'payment' | 'attestation' | 'error';
  message: string;
  agentId?: string;
}

interface Props {
  entries: NegotiationEntry[];
  isStreaming: boolean;
}

const TYPE_STYLES: Record<string, { color: string; label: string }> = {
  decomposition: { color: 'text-blue-400', label: 'DECOMPOSE' },
  rfq: { color: 'text-purple-400', label: 'RFQ' },
  selection: { color: 'text-primary', label: 'SELECT' },
  payment: { color: 'text-accent-green', label: 'PAY' },
  attestation: { color: 'text-cyan-400', label: 'ATTEST' },
  error: { color: 'text-accent-rose', label: 'ERROR' },
};

export function NegotiationLog({ entries, isStreaming }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [entries]);

  return (
    <div className="bg-surface border border-surface-light rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-gray-300">Reasoning + Negotiation Log</h3>
        {isStreaming && (
          <span className="flex items-center gap-1 text-xs text-primary">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span>
            streaming
          </span>
        )}
      </div>

      <div ref={scrollRef} className="h-[400px] overflow-y-auto space-y-1 font-mono text-xs">
        {entries.length === 0 && (
          <div className="text-gray-600 text-center py-8">
            Submit a task to see negotiation reasoning...
          </div>
        )}
        {entries.map((entry) => {
          const style = TYPE_STYLES[entry.type] || TYPE_STYLES.error;
          return (
            <div key={entry.id} className="flex gap-2 py-0.5">
              <span className={`${style.color} shrink-0 w-[72px] text-right`}>
                [{style.label}]
              </span>
              <span className="text-gray-300">{entry.message}</span>
            </div>
          );
        })}
        {isStreaming && (
          <div className="flex gap-2 py-0.5">
            <span className="text-primary shrink-0 w-[72px] text-right">
              [...]
            </span>
            <span className="text-gray-500 animate-pulse">thinking...</span>
          </div>
        )}
      </div>
    </div>
  );
}
