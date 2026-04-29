'use client';

interface TaskResult {
  taskId: string;
  content: string;
  qualityScore: number;
  costBreakdown: { agentId: string; cost: number }[];
  totalCost: number;
  attestationTxHash: string;
  completedAt: string;
}

interface Props {
  result: TaskResult | null;
}

export function TaskOutput({ result }: Props) {
  if (!result) {
    return (
      <div className="bg-surface border border-surface-light rounded-lg p-4">
        <h3 className="text-sm font-medium text-gray-300 mb-3">Task Output</h3>
        <div className="text-xs text-gray-600 text-center py-8">
          Results will appear here after task completion...
        </div>
      </div>
    );
  }

  const stars = Array.from({ length: 5 }, (_, i) => i < result.qualityScore ? '\u2605' : '\u2606').join('');
  const explorerUrl = `https://testnet.kitescan.ai/tx/${result.attestationTxHash}`;

  return (
    <div className="bg-surface border border-surface-light rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-gray-300">Task Output</h3>
        <span className="text-xs text-primary">{stars}</span>
      </div>

      {/* Content preview */}
      <div className="max-h-[200px] overflow-y-auto text-xs text-gray-300 font-mono bg-background rounded-lg p-3 mb-3 whitespace-pre-wrap">
        {result.content.slice(0, 800)}
        {result.content.length > 800 && '...'}
      </div>

      {/* Cost breakdown */}
      <div className="space-y-1 mb-3">
        <p className="text-xs text-gray-500">Cost Breakdown</p>
        {result.costBreakdown.map((item) => (
          <div key={item.agentId} className="flex items-center justify-between text-xs">
            <span className="text-gray-400">{item.agentId}</span>
            <span className="font-mono text-accent-green">${item.cost.toFixed(2)}</span>
          </div>
        ))}
        <div className="flex items-center justify-between text-xs pt-1 border-t border-surface-light">
          <span className="text-white font-medium">Total</span>
          <span className="font-mono text-primary">${result.totalCost.toFixed(2)}</span>
        </div>
      </div>

      {/* Attestation link */}
      <a
        href={explorerUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="block text-xs text-cyan-400 hover:text-cyan-300 font-mono truncate transition"
      >
        Attestation: {result.attestationTxHash.slice(0, 22)}...
      </a>
    </div>
  );
}
