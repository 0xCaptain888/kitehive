'use client';

import { useRef, useEffect, useState } from 'react';

interface Agent {
  id: string;
  type: string;
  earnings: number;
  reputation: number;
  tier: string;
  completedTasks: number;
  currentPrice: number;
}

interface Payment {
  from: string;
  to: string;
  amount: number;
  timestamp: number;
}

interface Props {
  agents: Agent[];
  payments: Payment[];
  spent: number;
  budget: number;
}

const NODE_COLORS: Record<string, string> = {
  coordinator: '#F59E0B',
  research: '#60A5FA',
  writing: '#A78BFA',
  external_api: '#34D399',
};

export function EconomyGraph({ agents, payments, spent, budget }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [dimensions, setDimensions] = useState({ width: 700, height: 350 });

  useEffect(() => {
    const updateDimensions = () => {
      if (svgRef.current?.parentElement) {
        setDimensions({
          width: svgRef.current.parentElement.clientWidth,
          height: 350,
        });
      }
    };
    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  const { width, height } = dimensions;
  const centerX = width / 2;
  const centerY = height / 2;

  // Position coordinator at center, agents in a circle
  const nodes = [
    { id: 'coordinator', type: 'coordinator', x: centerX, y: centerY, label: 'Coordinator', earnings: 0, reputation: 0 },
    ...agents.map((agent, i) => {
      const angle = (i / agents.length) * 2 * Math.PI - Math.PI / 2;
      const radius = Math.min(width, height) * 0.35;
      return {
        id: agent.id,
        type: agent.type,
        x: centerX + Math.cos(angle) * radius,
        y: centerY + Math.sin(angle) * radius,
        label: agent.id.replace(/-/g, ' '),
        earnings: agent.earnings,
        reputation: agent.reputation,
      };
    }),
  ];

  // Recent payments as edges
  const recentPayments = payments.slice(-10);

  return (
    <div className="bg-surface border border-surface-light rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-gray-300">Agent Economy Graph</h3>
        <div className="text-xs text-gray-500">
          Total spent: <span className="text-primary font-mono">${spent.toFixed(2)}</span> / ${budget.toFixed(2)}
        </div>
      </div>
      <svg ref={svgRef} width={width} height={height} className="overflow-visible">
        <defs>
          <marker id="arrowhead" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
            <polygon points="0 0, 8 3, 0 6" fill="#F59E0B" opacity="0.5" />
          </marker>
          {recentPayments.map((_, i) => (
            <linearGradient key={`grad-${i}`} id={`payment-grad-${i}`}>
              <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#34D399" stopOpacity="0.8" />
            </linearGradient>
          ))}
        </defs>

        {/* Grid background */}
        <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#1F2937" strokeWidth="0.5" />
        </pattern>
        <rect width={width} height={height} fill="url(#grid)" rx="8" />

        {/* Payment edges */}
        {recentPayments.map((payment, i) => {
          const fromNode = nodes.find((n) => n.id === payment.from);
          const toNode = nodes.find((n) => n.id === payment.to);
          if (!fromNode || !toNode) return null;

          return (
            <g key={`payment-${i}`}>
              <line
                x1={fromNode.x}
                y1={fromNode.y}
                x2={toNode.x}
                y2={toNode.y}
                stroke={`url(#payment-grad-${i})`}
                strokeWidth="2"
                markerEnd="url(#arrowhead)"
                opacity="0.6"
              />
              <text
                x={(fromNode.x + toNode.x) / 2}
                y={(fromNode.y + toNode.y) / 2 - 8}
                fill="#F59E0B"
                fontSize="10"
                fontFamily="Fira Code, monospace"
                textAnchor="middle"
              >
                ${payment.amount.toFixed(2)}
              </text>
              {/* Animated particle */}
              <circle r="3" fill="#F59E0B" opacity="0.8">
                <animateMotion
                  dur="1.5s"
                  repeatCount="1"
                  path={`M${fromNode.x},${fromNode.y} L${toNode.x},${toNode.y}`}
                  begin={`${i * 0.2}s`}
                />
                <animate attributeName="opacity" values="0;1;1;0" dur="1.5s" begin={`${i * 0.2}s`} />
              </circle>
            </g>
          );
        })}

        {/* Agent nodes */}
        {nodes.map((node) => {
          const color = NODE_COLORS[node.type] || '#9CA3AF';
          const isCoordinator = node.type === 'coordinator';
          const radius = isCoordinator ? 28 : 22;

          return (
            <g key={node.id}>
              {/* Glow effect */}
              <circle cx={node.x} cy={node.y} r={radius + 6} fill={color} opacity="0.1" className="animate-pulse-glow" />
              {/* Node */}
              <circle cx={node.x} cy={node.y} r={radius} fill="#111827" stroke={color} strokeWidth="2" />
              {/* Label */}
              <text x={node.x} y={node.y - radius - 8} fill="#E5E7EB" fontSize="11" fontWeight="500" textAnchor="middle">
                {isCoordinator ? 'Coordinator' : node.label.split(' ').slice(0, 2).join(' ')}
              </text>
              {/* Earnings */}
              {!isCoordinator && (
                <text x={node.x} y={node.y + 4} fill={color} fontSize="10" fontFamily="Fira Code, monospace" textAnchor="middle">
                  ${node.earnings.toFixed(2)}
                </text>
              )}
              {/* Type icon */}
              <text x={node.x} y={isCoordinator ? node.y + 5 : node.y + 18} fill="#9CA3AF" fontSize="9" textAnchor="middle">
                {isCoordinator ? '\uD83D\uDC1D' : node.type === 'external_api' ? 'API*' : ''}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
