'use client';

import { useState } from 'react';

interface Preset {
  label: string;
  description: string;
  icon: string;
}

interface Props {
  presets: Preset[];
  onSubmit: (task: string) => void;
  isRunning: boolean;
  budget: number;
  spent: number;
}

export function TaskInput({ presets, onSubmit, isRunning, budget, spent }: Props) {
  const [customTask, setCustomTask] = useState('');

  return (
    <div className="bg-surface border border-surface-light rounded-lg p-4">
      <h3 className="text-sm font-medium text-gray-300 mb-3">Task Input</h3>

      {/* Preset buttons */}
      <div className="space-y-2 mb-4">
        {presets.map((preset) => (
          <button
            key={preset.label}
            onClick={() => onSubmit(preset.description)}
            disabled={isRunning}
            className="w-full text-left px-3 py-2.5 rounded-lg bg-surface-light/50 border border-surface-light hover:border-primary/50 hover:bg-primary/5 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="flex items-center gap-2">
              <span>{preset.icon}</span>
              <span className="text-sm text-white font-medium">{preset.label}</span>
            </div>
            <p className="text-xs text-gray-500 mt-1 ml-6">{preset.description}</p>
          </button>
        ))}
      </div>

      {/* Custom input */}
      <div className="space-y-2">
        <textarea
          value={customTask}
          onChange={(e) => setCustomTask(e.target.value)}
          placeholder="Or enter a custom task..."
          rows={3}
          className="w-full bg-background border border-surface-light rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-gray-600 resize-none focus:outline-none focus:border-primary"
        />
        <button
          onClick={() => { if (customTask.trim()) { onSubmit(customTask.trim()); setCustomTask(''); } }}
          disabled={isRunning || !customTask.trim()}
          className="w-full py-2 rounded-lg bg-primary text-background font-medium text-sm hover:bg-primary/90 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isRunning ? 'Running...' : 'Submit Task'}
        </button>
      </div>

      {/* Budget bar */}
      <div className="mt-3 pt-3 border-t border-surface-light">
        <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
          <span>Session Budget</span>
          <span className="font-mono">${spent.toFixed(2)} / ${budget.toFixed(2)}</span>
        </div>
        <div className="h-1.5 bg-surface-light rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-500"
            style={{ width: `${Math.min((spent / budget) * 100, 100)}%` }}
          />
        </div>
      </div>
    </div>
  );
}
