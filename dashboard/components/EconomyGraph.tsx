'use client';

import { useRef, useEffect, useState } from 'react';
import * as d3 from 'd3';

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

interface SimNode extends d3.SimulationNodeDatum {
  id: string;
  type: string;
  label: string;
  earnings: number;
  reputation: number;
}

interface SimLink extends d3.SimulationLinkDatum<SimNode> {
  amount: number;
  timestamp: number;
}

const NODE_COLORS: Record<string, string> = {
  coordinator: '#F59E0B',
  research: '#60A5FA',
  writing: '#A78BFA',
  external_api: '#34D399',
};

export function EconomyGraph({ agents, payments, spent, budget }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const simulationRef = useRef<d3.Simulation<SimNode, SimLink> | null>(null);
  const nodesRef = useRef<SimNode[]>([]);
  const linksRef = useRef<SimLink[]>([]);
  const [dimensions, setDimensions] = useState({ width: 700, height: 350 });
  const [, forceRender] = useState(0);
  const particlesRef = useRef<{ x: number; y: number; progress: number; amount: number; linkIndex: number }[]>([]);
  const animFrameRef = useRef<number>(0);

  // Resize handler
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

  // Build and update the force simulation when agents change
  useEffect(() => {
    const coordNode: SimNode = {
      id: 'coordinator',
      type: 'coordinator',
      label: 'Coordinator',
      earnings: 0,
      reputation: 0,
      fx: width / 2,
      fy: height / 2,
    };

    const agentNodes: SimNode[] = agents.map((a) => {
      // Preserve existing position if node already exists
      const existing = nodesRef.current.find((n) => n.id === a.id);
      return {
        id: a.id,
        type: a.type,
        label: a.id.replace(/-/g, ' '),
        earnings: a.earnings,
        reputation: a.reputation,
        x: existing?.x ?? width / 2 + (Math.random() - 0.5) * 100,
        y: existing?.y ?? height / 2 + (Math.random() - 0.5) * 100,
      };
    });

    const newNodes = [coordNode, ...agentNodes];
    nodesRef.current = newNodes;

    // Build links from recent payments
    const recentPayments = payments.slice(-10);
    const newLinks: SimLink[] = recentPayments
      .map((p) => {
        const source = newNodes.find((n) => n.id === p.from);
        const target = newNodes.find((n) => n.id === p.to);
        if (!source || !target) return null;
        return { source, target, amount: p.amount, timestamp: p.timestamp };
      })
      .filter(Boolean) as SimLink[];
    linksRef.current = newLinks;

    // Stop previous simulation
    if (simulationRef.current) simulationRef.current.stop();

    // Create force simulation
    const sim = d3
      .forceSimulation<SimNode>(newNodes)
      .force(
        'link',
        d3
          .forceLink<SimNode, SimLink>(newLinks)
          .id((d) => d.id)
          .distance(120)
          .strength(0.3),
      )
      .force(
        'charge',
        d3.forceManyBody<SimNode>().strength((d) => (d.type === 'coordinator' ? -400 : -150)),
      )
      .force('center', d3.forceCenter(width / 2, height / 2).strength(0.05))
      .force('collision', d3.forceCollide<SimNode>().radius(40))
      .alphaDecay(0.02)
      .on('tick', () => {
        // Clamp nodes within bounds
        for (const node of newNodes) {
          if (node.fx == null) {
            node.x = Math.max(40, Math.min(width - 40, node.x ?? width / 2));
            node.y = Math.max(40, Math.min(height - 40, node.y ?? height / 2));
          }
        }
        forceRender((v) => v + 1);
      });

    simulationRef.current = sim;

    return () => {
      sim.stop();
    };
  }, [agents, payments, width, height]);

  // Particle animation loop
  useEffect(() => {
    let lastTime = performance.now();

    const animate = (time: number) => {
      const dt = (time - lastTime) / 1000;
      lastTime = time;

      const particles = particlesRef.current;
      for (let i = particles.length - 1; i >= 0; i--) {
        particles[i].progress += dt * 0.6; // speed: traverse link in ~1.7s
        if (particles[i].progress >= 1) {
          particles.splice(i, 1);
        }
      }

      // Compute positions
      const links = linksRef.current;
      for (const p of particles) {
        const link = links[p.linkIndex];
        if (!link) continue;
        const s = link.source as SimNode;
        const t = link.target as SimNode;
        if (s.x != null && s.y != null && t.x != null && t.y != null) {
          p.x = s.x + (t.x - s.x) * p.progress;
          p.y = s.y + (t.y - s.y) * p.progress;
        }
      }

      forceRender((v) => v + 1);
      animFrameRef.current = requestAnimationFrame(animate);
    };

    animFrameRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, []);

  // Spawn particles when new payments arrive
  const prevPaymentCountRef = useRef(0);
  useEffect(() => {
    const newCount = payments.length;
    if (newCount > prevPaymentCountRef.current) {
      const recentPayments = payments.slice(-10);
      // Spawn particles for the new links
      const startIdx = Math.max(0, recentPayments.length - (newCount - prevPaymentCountRef.current));
      for (let i = startIdx; i < recentPayments.length; i++) {
        // Spawn 3 particles per payment for visual effect
        for (let j = 0; j < 3; j++) {
          particlesRef.current.push({
            x: 0,
            y: 0,
            progress: j * -0.15, // stagger
            amount: recentPayments[i].amount,
            linkIndex: i,
          });
        }
      }
    }
    prevPaymentCountRef.current = newCount;
  }, [payments]);

  const nodes = nodesRef.current;
  const links = linksRef.current;
  const particles = particlesRef.current;

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
          <radialGradient id="particle-glow">
            <stop offset="0%" stopColor="#F59E0B" stopOpacity="1" />
            <stop offset="100%" stopColor="#F59E0B" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Grid background */}
        <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#1F2937" strokeWidth="0.5" />
        </pattern>
        <rect width={width} height={height} fill="url(#grid)" rx="8" />

        {/* Payment edges */}
        {links.map((link, i) => {
          const s = link.source as SimNode;
          const t = link.target as SimNode;
          if (s.x == null || s.y == null || t.x == null || t.y == null) return null;
          return (
            <g key={`link-${i}`}>
              <line
                x1={s.x}
                y1={s.y}
                x2={t.x}
                y2={t.y}
                stroke="#F59E0B"
                strokeWidth="1.5"
                strokeOpacity="0.3"
                markerEnd="url(#arrowhead)"
              />
              <text
                x={(s.x + t.x) / 2}
                y={(s.y + t.y) / 2 - 8}
                fill="#F59E0B"
                fontSize="10"
                fontFamily="Fira Code, monospace"
                textAnchor="middle"
              >
                ${link.amount.toFixed(2)}
              </text>
            </g>
          );
        })}

        {/* Flowing particles */}
        {particles.map((p, i) => {
          if (p.progress < 0 || p.progress > 1) return null;
          return (
            <g key={`particle-${i}`}>
              <circle cx={p.x} cy={p.y} r="6" fill="url(#particle-glow)" opacity={0.4} />
              <circle cx={p.x} cy={p.y} r="3" fill="#F59E0B" opacity={0.9} />
            </g>
          );
        })}

        {/* Agent nodes */}
        {nodes.map((node) => {
          const color = NODE_COLORS[node.type] || '#9CA3AF';
          const isCoordinator = node.type === 'coordinator';
          const radius = isCoordinator ? 28 : 22;
          const nx = node.x ?? 0;
          const ny = node.y ?? 0;

          return (
            <g key={node.id}>
              {/* Glow effect */}
              <circle cx={nx} cy={ny} r={radius + 6} fill={color} opacity="0.1" className="animate-pulse-glow" />
              {/* Node body */}
              <circle cx={nx} cy={ny} r={radius} fill="#111827" stroke={color} strokeWidth="2" />
              {/* Label */}
              <text
                x={nx}
                y={ny - radius - 8}
                fill="#E5E7EB"
                fontSize="11"
                fontWeight="500"
                textAnchor="middle"
              >
                {isCoordinator ? 'Coordinator' : node.label.split(' ').slice(0, 2).join(' ')}
              </text>
              {/* Earnings */}
              {!isCoordinator && (
                <text
                  x={nx}
                  y={ny + 4}
                  fill={color}
                  fontSize="10"
                  fontFamily="Fira Code, monospace"
                  textAnchor="middle"
                >
                  ${node.earnings.toFixed(2)}
                </text>
              )}
              {/* Type icon */}
              <text
                x={nx}
                y={isCoordinator ? ny + 5 : ny + 18}
                fill="#9CA3AF"
                fontSize="9"
                textAnchor="middle"
              >
                {isCoordinator ? '\uD83D\uDC1D' : node.type === 'external_api' ? 'API*' : ''}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
