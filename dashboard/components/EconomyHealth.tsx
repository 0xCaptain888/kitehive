'use client';

interface EconomyMetrics {
  giniCoefficient: number;
  marketEfficiency: number;
  explorationRate: number;
  priceVolatility24h: number;
  totalTransactions: number;
  totalVolume: number;
  activeAgents: number;
}

interface Props {
  metrics: EconomyMetrics;
}

function getGiniStatus(gini: number): { label: string; color: string } {
  if (gini < 0.25) return { label: 'Very Equal', color: 'text-accent-green' };
  if (gini < 0.45) return { label: 'Healthy', color: 'text-primary' };
  if (gini < 0.5) return { label: 'Warning', color: 'text-yellow-400' };
  return { label: 'Anti-Monopoly Active', color: 'text-accent-rose' };
}

export function EconomyHealth({ metrics }: Props) {
  const giniStatus = getGiniStatus(metrics.giniCoefficient);

  return (
    <div className="bg-surface border border-surface-light rounded-lg p-4">
      <h3 className="text-sm font-medium text-gray-300 mb-3">Economy Health</h3>
      <div className="space-y-3">
        <div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-500">Gini Coefficient</span>
            <span className={giniStatus.color}>{giniStatus.label}</span>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <div className="flex-1 h-1.5 bg-surface-light rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${metrics.giniCoefficient * 100}%`,
                  backgroundColor: metrics.giniCoefficient > 0.5 ? '#F87171' : metrics.giniCoefficient > 0.45 ? '#FBBF24' : '#34D399',
                }}
              />
            </div>
            <span className="text-xs font-mono text-white w-10 text-right">{metrics.giniCoefficient.toFixed(2)}</span>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-500">Market Efficiency</span>
            <span className="text-accent-green">{(metrics.marketEfficiency * 100).toFixed(0)}%</span>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <div className="flex-1 h-1.5 bg-surface-light rounded-full overflow-hidden">
              <div className="h-full bg-accent-green rounded-full transition-all duration-500" style={{ width: `${metrics.marketEfficiency * 100}%` }} />
            </div>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-500">Exploration Rate</span>
            <span className="text-blue-400">{(metrics.explorationRate * 100).toFixed(0)}%</span>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <div className="flex-1 h-1.5 bg-surface-light rounded-full overflow-hidden">
              <div className="h-full bg-blue-400 rounded-full transition-all duration-500" style={{ width: `${metrics.explorationRate * 100}%` }} />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs pt-1 border-t border-surface-light">
          <span className="text-gray-500">Price Volatility (24h)</span>
          <span className="font-mono text-white">&plusmn;{metrics.priceVolatility24h.toFixed(1)}%</span>
        </div>

        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-500">Total Transactions</span>
          <span className="font-mono text-white">{metrics.totalTransactions}</span>
        </div>

        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-500">Active Agents</span>
          <span className="font-mono text-white">{metrics.activeAgents}</span>
        </div>
      </div>
    </div>
  );
}
