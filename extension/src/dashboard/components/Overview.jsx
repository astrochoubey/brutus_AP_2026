// Overview.jsx — High-level metric cards at the top of the dashboard.
//
// Uses computeNetworkMetrics() from statistics.js to derive all displayed values.
// Never fabricates data — if snapshot is null, shows dashes.

import { computeNetworkMetrics } from '../../utils/statistics.js';

export default function Overview({ snapshot }) {
  const metrics = snapshot
    ? computeNetworkMetrics({
        followers: snapshot.totalFollowers ?? 0,
        following: snapshot.totalFollowing ?? 0,
        mutuals:   snapshot.totalMutuals ?? 0
      })
    : null;

  const cards = [
    { label: 'Followers',           value: metrics?.totalFollowers },
    { label: 'Following',           value: metrics?.totalFollowing },
    { label: 'Mutuals',             value: metrics?.totalMutuals },
    { label: 'Not Following Back',  value: metrics?.followingOnly },
    { label: "Don't Follow Back",   value: metrics?.followersOnly },
    { label: 'Reciprocity',         value: metrics ? `${(metrics.reciprocity * 100).toFixed(1)}%` : null },
    { label: 'Follow Ratio',        value: metrics?.followRatio }
  ];

  const display = (v) => (v !== null && v !== undefined ? v.toLocaleString() : '—');

  return (
    <div className="dash-card">
      <h2 className="dash-card-title">Overview</h2>
      <div className="overview-grid">
        {cards.map((c) => (
          <div className="overview-metric" key={c.label}>
            <div className="ov-value">{typeof c.value === 'string' ? c.value : display(c.value)}</div>
            <div className="ov-label">{c.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
