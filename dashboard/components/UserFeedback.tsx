'use client';

import { useState } from 'react';

interface Props {
  taskId: string;
  autoScore: number;
  onRate: (rating: number) => void;
}

export function UserFeedback({ taskId, autoScore, onRate }: Props) {
  const [hoveredStar, setHoveredStar] = useState(0);
  const [selectedStar, setSelectedStar] = useState(0);

  return (
    <div className="bg-surface border border-surface-light rounded-lg p-4">
      <h3 className="text-sm font-medium text-gray-300 mb-2">Rate This Result</h3>
      <p className="text-xs text-gray-500 mb-3">
        Auto-score: {autoScore}/5 — your feedback calibrates the Coordinator
      </p>

      <div className="flex items-center justify-center gap-1 mb-3">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            onMouseEnter={() => setHoveredStar(star)}
            onMouseLeave={() => setHoveredStar(0)}
            onClick={() => {
              setSelectedStar(star);
              onRate(star);
            }}
            className="text-2xl transition-transform hover:scale-110"
          >
            <span className={(hoveredStar || selectedStar) >= star ? 'text-primary' : 'text-gray-600'}>
              {'\u2605'}
            </span>
          </button>
        ))}
      </div>

      {selectedStar > 0 && Math.abs(selectedStar - autoScore) >= 2 && (
        <p className="text-xs text-accent-rose text-center">
          Significant deviation detected — logged for Coordinator calibration
        </p>
      )}
    </div>
  );
}
