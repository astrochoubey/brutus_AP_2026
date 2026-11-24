// Overview.jsx — High-level metric cards for the dashboard header.
// Derives values strictly from computeNetworkMetrics() in statistics.js.

import { computeNetworkMetrics } from '../../utils/statistics.js';

export default function Overview({ snapshot }) {
  const metrics = snapshot
    ? computeNetworkMetrics({
        followers: snapshot.totalFollowers ?? snapshot.followers?.length ?? 0,
        following: snapshot.totalFollowing ?? snapshot.following?.length ?? 0,
        mutuals:   snapshot.totalMutuals ?? snapshot.mutuals?.length ?? 0
      })
    : null;

  const display = (v) => (v !== null && v !== undefined ? Number(v).toLocaleString() : '—');

  const cards = [
    { label: 'Total Followers',       value: metrics ? display(metrics.totalFollowers) : '—', tag: 'Audience' },
    { label: 'Total Following',       value: metrics ? display(metrics.totalFollowing) : '—', tag: 'Network' },
    { label: 'Mutual Followers',      value: metrics ? (metrics.isIncomplete ? '—' : display(metrics.totalMutuals)) : '—', tag: 'Reciprocal' },
    { label: 'Not Following Back',   value: metrics ? (metrics.isIncomplete ? '—' : display(metrics.followingOnly)) : '—', tag: 'Following Only' },
    { label: 'Fans (Follower Only)',  value: metrics ? (metrics.isIncomplete ? '—' : display(metrics.followersOnly)) : '—', tag: 'Unreciprocated' },
    {
      label: 'Reciprocity Rate',
      value: metrics ? (metrics.isIncomplete ? '—' : `${(metrics.reciprocity * 100).toFixed(1)}%`) : '—',
      tag: 'Health'
    },
    {
      label: 'Follow Ratio',
      value: metrics ? (metrics.isIncomplete ? '—' : metrics.followRatio.toFixed(2)) : '—',
      tag: 'Balance'
    }
  ];

  return (
    <div className="dash-overview-card">
      <div className="dash-section-header">
        <h2 className="dash-heading">Executive Overview</h2>
        <span className="dash-subheading">Core Instagram Network Topology</span>
      </div>

      <div className="dash-metric-strip">
        {cards.map((c) => (
          <div className="dash-kpi-card" key={c.label}>
            <div className="kpi-tag-row">
              <span className="kpi-label">{c.label}</span>
              <span className="kpi-tag">{c.tag}</span>
            </div>
            <div className="kpi-value">{c.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
