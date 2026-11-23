// NetworkGraph.jsx — Native SVG social graph visualization.
//
// Uses buildNetworkGraph() from graph.js to get nodes and edges.
// No third-party graph library — just plain SVG circles and lines.
//
// Ponytail:
//   Input: classified = { mutuals: [...], notFollowingBack: [...], dontFollowBack: [...] }
//   buildNetworkGraph() returns { nodes: [...], edges: [...] }
//   We place the observer at center, other nodes in a circle around it.
//   Edge lines connect them. Colour indicates relationship type.
//
// Cap: render at most 60 nodes total so the SVG stays readable.

import { buildNetworkGraph } from '../../utils/graph.js';
import EmptyState from '../../components/EmptyState.jsx';

const NODE_COLOR = {
  observer:      '#204654',
  mutual:        '#CAFFA6',
  following_only:'#A9E0F1',
  follower_only: '#fff3cd'
};

const NODE_STROKE = {
  observer:      '#204654',
  mutual:        '#204654',
  following_only:'#204654',
  follower_only: '#856404'
};

const MAX_NODES = 60;

export default function NetworkGraph({ classified, observerUsername }) {
  if (!classified) {
    return (
      <div className="dash-card">
        <h2 className="dash-card-title">Network Graph</h2>
        <EmptyState title="No data" description="Run a scan to generate your network graph." />
      </div>
    );
  }

  // Cap each category so the total stays manageable.
  const mutuals    = (classified.mutuals || []).slice(0, 20);
  const following  = (classified.notFollowingBack || []).slice(0, 20);
  const followers  = (classified.dontFollowBack || []).slice(0, 20);

  const { nodes, edges } = buildNetworkGraph(
    observerUsername || 'You',
    mutuals,
    following,
    followers
  );

  // Cap total visible nodes.
  const visibleNodes = nodes.slice(0, MAX_NODES);
  const visibleIds   = new Set(visibleNodes.map((n) => n.id));

  // Layout: observer at center, others in a circle.
  const W = 540, H = 400;
  const cx = W / 2, cy = H / 2, R = 160;

  const others = visibleNodes.filter((n) => n.id !== 'observer');
  const angleStep = others.length > 0 ? (2 * Math.PI) / others.length : 0;

  const positions = { observer: { x: cx, y: cy } };
  others.forEach((node, i) => {
    const angle = i * angleStep - Math.PI / 2;
    positions[node.id] = {
      x: cx + R * Math.cos(angle),
      y: cy + R * Math.sin(angle)
    };
  });

  const visibleEdges = edges.filter(
    (e) => visibleIds.has(e.source) && visibleIds.has(e.target)
  );

  const totalNodes = nodes.length - 1; // exclude observer
  const capped = totalNodes > MAX_NODES - 1;

  return (
    <div className="dash-card">
      <h2 className="dash-card-title">Network Graph</h2>
      {capped && (
        <p style={{ fontSize: '0.78rem', color: '#888', marginBottom: 10 }}>
          Showing first {MAX_NODES - 1} of {totalNodes} connections for clarity.
        </p>
      )}

      <div className="network-graph-wrap">
        <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto' }}>
          {/* Draw edges first so they appear behind nodes */}
          {visibleEdges.map((edge) => {
            const src = positions[edge.source];
            const tgt = positions[edge.target];
            if (!src || !tgt) return null;
            return (
              <line
                key={edge.id}
                x1={src.x} y1={src.y}
                x2={tgt.x} y2={tgt.y}
                stroke="#A9E0F1"
                strokeWidth={1.5}
                strokeOpacity={0.7}
              />
            );
          })}

          {/* Draw nodes */}
          {visibleNodes.map((node) => {
            const pos = positions[node.id];
            if (!pos) return null;
            const fill   = NODE_COLOR[node.type]   || '#ccc';
            const stroke = NODE_STROKE[node.type]  || '#888';
            const r = node.size || 10;
            return (
              <g key={node.id}>
                <circle
                  cx={pos.x} cy={pos.y}
                  r={r}
                  fill={fill}
                  stroke={stroke}
                  strokeWidth={1.5}
                />
                {/* Show label only for observer and a small font for others */}
                <text
                  x={pos.x}
                  y={pos.y + r + 10}
                  textAnchor="middle"
                  fontSize={node.type === 'observer' ? 11 : 9}
                  fill="#204654"
                  style={{ pointerEvents: 'none', userSelect: 'none' }}
                >
                  {node.label.length > 10 ? node.label.slice(0, 10) + '…' : node.label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Legend */}
      <div className="graph-legend">
        {[
          { color: NODE_COLOR.observer,      label: 'You' },
          { color: NODE_COLOR.mutual,        label: 'Mutual' },
          { color: NODE_COLOR.following_only,label: 'Not Following Back' },
          { color: NODE_COLOR.follower_only, label: "Don't Follow Back" }
        ].map((l) => (
          <span key={l.label}>
            <span className="legend-dot" style={{ background: l.color }} />
            {l.label}
          </span>
        ))}
      </div>
    </div>
  );
}
