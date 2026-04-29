import { NextRequest } from 'next/server';

// Economy metrics state
const economyState = {
  metrics: {
    giniCoefficient: 0.38,
    marketEfficiency: 0.72,
    explorationRate: 0.18,
    priceVolatility24h: 14.2,
    totalTransactions: 122,
    totalVolume: 25.70,
    activeAgents: 4,
  },
  agentEarnings: {
    'research-agent-a': 12.50,
    'writer-agent-a': 8.30,
    'writer-agent-b': 3.10,
    'external-api': 1.80,
  },
  priceHistory: {
    'research-agent-a': [0.52, 0.55, 0.48, 0.60, 0.55, 0.58, 0.53, 0.55],
    'writer-agent-a': [0.30, 0.33, 0.35, 0.32, 0.38, 0.35, 0.33, 0.35],
    'writer-agent-b': [0.22, 0.25, 0.20, 0.28, 0.25, 0.23, 0.26, 0.25],
    'external-api': [0.10, 0.10, 0.12, 0.10, 0.11, 0.10, 0.10, 0.10],
  },
  coordinatorAccuracy: {
    total: 47,
    withinThreshold: 41,
    percentage: 87.2,
  },
};

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const detail = searchParams.get('detail');

  if (detail === 'full') {
    return Response.json({
      ...economyState,
      antiMonopolyActive: economyState.metrics.giniCoefficient > 0.5,
      explorationBoost: economyState.metrics.giniCoefficient > 0.5 ? 1.5 : 1.0,
      healthStatus: getHealthStatus(economyState.metrics),
    });
  }

  return Response.json({
    metrics: economyState.metrics,
    coordinatorAccuracy: economyState.coordinatorAccuracy,
    antiMonopolyActive: economyState.metrics.giniCoefficient > 0.5,
  });
}

function getHealthStatus(metrics: typeof economyState.metrics) {
  const issues: string[] = [];
  if (metrics.giniCoefficient > 0.5) issues.push('High inequality — anti-monopoly active');
  if (metrics.explorationRate < 0.1) issues.push('Low exploration — may miss better agents');
  if (metrics.explorationRate > 0.35) issues.push('High exploration — may waste budget');
  if (metrics.marketEfficiency < 0.5) issues.push('Low market efficiency — pricing may be inaccurate');

  return {
    status: issues.length === 0 ? 'healthy' : issues.length <= 1 ? 'warning' : 'critical',
    issues,
  };
}
