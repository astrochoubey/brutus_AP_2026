// NetworkStats.jsx — Detailed analytics metrics in a table.
//
// Uses computeNetworkMetrics() and calculates growth rate when two snapshots exist.

import {
  computeNetworkMetrics,
  calculateReciprocity,
  calculateFollowRatio,
  calculateGrowthRate
} from '../../utils/statistics.js';

export default function NetworkStats({ snapshot, prevSnapshot }) {
  if (!snapshot) {
    return (
      <div className="dash-card">
        <h2 className="dash-card-title">Network Statistics</h2>
        <p style={{ color: '#888', fontSize: '0.85rem' }}>No snapshot data available yet.</p>
      </div>
    );
  }

  const m = computeNetworkMetrics({
    followers: snapshot.totalFollowers ?? 0,
    following: snapshot.totalFollowing ?? 0,
    mutuals:   snapshot.totalMutuals ?? 0
  });

  // Growth rate is only meaningful when we have two snapshots.
  const growthRate = prevSnapshot
    ? calculateGrowthRate(snapshot.totalFollowers, prevSnapshot.totalFollowers)
    : null;

  const rows = [
    { label: 'Total Followers',      value: m.totalFollowers.toLocaleString() },
    { label: 'Total Following',      value: m.totalFollowing.toLocaleString() },
    { label: 'Mutual Connections',   value: m.isIncomplete ? '—' : m.totalMutuals.toLocaleString() },
    { label: 'Following Only',       value: m.isIncomplete ? '—' : m.followingOnly.toLocaleString() },
    { label: 'Followers Only',       value: m.isIncomplete ? '—' : m.followersOnly.toLocaleString() },
    { label: 'Reciprocity Ratio',    value: m.isIncomplete ? '—' : `${(m.reciprocity * 100).toFixed(2)}%` },
    { label: 'Follow Ratio',         value: m.followRatio.toFixed(2) },
    ...(growthRate !== null
      ? [{ label: 'Follower Growth', value: `${growthRate > 0 ? '+' : ''}${growthRate}%` }]
      : [])
  ];

  return (
    <div className="dash-card">
      <h2 className="dash-card-title">Network Statistics</h2>
      <table className="stats-table">
        <thead>
          <tr>
            <th>Metric</th>
            <th>Value</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.label}>
              <td>{r.label}</td>
              <td>{r.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
