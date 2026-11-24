// NetworkGraph.jsx — Native SVG social graph visualization with concentric orbital rings.
// Implemented strictly with standard SVG circles, lines, and text (no third-party chart libraries).

import { buildNetworkGraph } from '../../utils/graph.js';
import EmptyState from '../../components/EmptyState.jsx';

const NODE_FILL = {
  observer:       '#204654',
  mutual:         '#CAFFA6',
  following_only: '#A9E0F1',
  follower_only:  '#fef08a'
};

const NODE_STROKE = {
  observer:       '#CAFFA6',
  mutual:         '#204654',
  following_only: '#204654',
  follower_only:  '#854d0e'
};

const MAX_DISPLAY_NODES = 60;

export default function NetworkGraph({ classified, observerUsername }) {
  if (!classified) {
    return (
      <div className="dash-subcard">
        <h3 className="dash-card-title">Network Graph Topology</h3>
        <EmptyState title="No graph data" description="Complete a scan to render the social network topology." />
      </div>
    );
  }

  // Cap slices so nodes stay visually balanced
  const mutuals   = (classified.mutuals || []).slice(0, 20);
  const following = (classified.notFollowingBack || []).slice(0, 20);
  const followers = (classified.dontFollowBack || []).slice(0, 20);

  const { nodes, edges } = buildNetworkGraph(
    observerUsername || 'You',
    mutuals,
    following,
    followers
  );

  const visibleNodes = nodes.slice(0, MAX_DISPLAY_NODES);
  const visibleIds   = new Set(visibleNodes.map((n) => n.id));

  // Canvas geometry
  const W = 640;
  const H = 420;
  const cx = W / 2;
  const cy = H / 2;
  const R = 155;

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

  const totalConnections = nodes.length - 1;

  return (
    <div className="dash-subcard">
      <div className="dash-card-header-row">
        <div>
          <h3 className="dash-card-title">Social Graph Topology</h3>
          <span className="dash-subheading">
            Orbital relationship representation centered around your account
          </span>
        </div>
        {totalConnections > MAX_DISPLAY_NODES - 1 && (
          <span className="dash-badge-count">
            Sampled {MAX_DISPLAY_NODES - 1} of {totalConnections.toLocaleString()}
          </span>
        )}
      </div>

      <div className="svg-canvas-wrapper">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="network-svg-element"
          aria-label="Instagram network social graph"
        >
          {/* Orbital guide rings */}
          <circle cx={cx} cy={cy} r={R * 0.45} fill="none" stroke="rgba(169, 224, 241, 0.4)" strokeDasharray="3 3" />
          <circle cx={cx} cy={cy} r={R * 0.75} fill="none" stroke="rgba(169, 224, 241, 0.3)" strokeDasharray="4 4" />
          <circle cx={cx} cy={cy} r={R} fill="none" stroke="rgba(169, 224, 241, 0.5)" strokeWidth="1" />

          {/* Connection edge lines */}
          {visibleEdges.map((edge) => {
            const p1 = positions[edge.source];
            const p2 = positions[edge.target];
            if (!p1 || !p2) return null;
            return (
              <line
                key={edge.id}
                x1={p1.x}
                y1={p1.y}
                x2={p2.x}
                y2={p2.y}
                stroke="rgba(32, 70, 84, 0.16)"
                strokeWidth="1.2"
              />
            );
          })}

          {/* Peripheral nodes */}
          {others.map((node) => {
            const p = positions[node.id];
            if (!p) return null;
            const fill = NODE_FILL[node.type] || '#A9E0F1';
            const stroke = NODE_STROKE[node.type] || '#204654';

            return (
              <g key={node.id} className="svg-node-group">
                <circle
                  cx={p.x}
                  cy={p.y}
                  r="7"
                  fill={fill}
                  stroke={stroke}
                  strokeWidth="1.5"
                >
                  <title>{`@${node.label} (${node.type.replace('_', ' ')})`}</title>
                </circle>
              </g>
            );
          })}

          {/* Center Observer Node */}
          <circle
            cx={cx}
            cy={cy}
            r="16"
            fill={NODE_FILL.observer}
            stroke={NODE_STROKE.observer}
            strokeWidth="3"
          />
          <text
            x={cx}
            y={cy + 4}
            textAnchor="middle"
            fill="#CAFFA6"
            fontSize="9"
            fontWeight="bold"
            fontFamily="var(--font-sans)"
          >
            YOU
          </text>
        </svg>
      </div>

      {/* Graph Legend */}
      <div className="graph-legend-strip">
        <div className="legend-entry">
          <span className="legend-swatch" style={{ background: NODE_FILL.observer, border: `2px solid ${NODE_STROKE.observer}` }} />
          <span>Observer (You)</span>
        </div>
        <div className="legend-entry">
          <span className="legend-swatch" style={{ background: NODE_FILL.mutual, border: `1.5px solid ${NODE_STROKE.mutual}` }} />
          <span>Mutual Connection</span>
        </div>
        <div className="legend-entry">
          <span className="legend-swatch" style={{ background: NODE_FILL.following_only, border: `1.5px solid ${NODE_STROKE.following_only}` }} />
          <span>Following Only (Not Back)</span>
        </div>
        <div className="legend-entry">
          <span className="legend-swatch" style={{ background: NODE_FILL.follower_only, border: `1.5px solid ${NODE_STROKE.follower_only}` }} />
          <span>Fan (Follower Only)</span>
        </div>
      </div>
    </div>
  );
}
