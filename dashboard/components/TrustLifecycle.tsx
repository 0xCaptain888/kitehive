'use client';

interface TrustEvent {
  agent: string;
  oldTier: string;
  newTier: string;
  budgetChange: string;
  timestamp: number;
}

interface Props {
  events: TrustEvent[];
}

function getTierColor(tier: string): string {
  switch (tier) {
    case 'Trusted': return '#F59E0B';
    case 'Established': return '#34D399';
    case 'Growing': return '#60A5FA';
    default: return '#9CA3AF';
  }
}

export function TrustLifecycle({ events }: Props) {
  return (
    <div className="bg-surface border border-surface-light rounded-lg p-4">
      <h3 className="text-sm font-medium text-gray-300 mb-3">Trust Lifecycle</h3>
      {events.length === 0 ? (
        <p className="text-xs text-gray-600 text-center py-4">No tier changes yet</p>
      ) : (
        <div className="space-y-3">
          {events.slice(-5).reverse().map((event, i) => (
            <div key={i} className="relative pl-4 border-l-2 border-surface-light">
              <div className="absolute -left-[5px] top-1 w-2 h-2 rounded-full" style={{ backgroundColor: getTierColor(event.newTier) }} />
              <div className="text-xs">
                <span className="text-white font-medium">{event.agent}</span>
                <div className="flex items-center gap-1 mt-0.5 text-gray-400">
                  <span style={{ color: getTierColor(event.oldTier) }}>{event.oldTier}</span>
                  <span>&rarr;</span>
                  <span style={{ color: getTierColor(event.newTier) }}>{event.newTier}</span>
                </div>
                <div className="text-gray-500 mt-0.5">Budget: {event.budgetChange}</div>
                <div className="text-gray-600 mt-0.5">{new Date(event.timestamp).toLocaleString()}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
