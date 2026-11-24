// NetworkStats.jsx — Detailed analytics indicators and health ratios.

import {
  computeNetworkMetrics,
  calculateGrowthRate
} from '../../utils/statistics.js';

export default function NetworkStats({ snapshot, prevSnapshot }) {
  if (!snapshot) {
    return (
      <div className="dash-subcard">
        <h3 className="dash-card-title">Network Statistics</h3>
        <p className="dash-empty-hint">No snapshot data available yet. Run a scan to populate analytics.</p>
      </div>
    );
  }

  const m = computeNetworkMetrics({
    followers: snapshot.totalFollowers ?? snapshot.followers?.length ?? 0,
    following: snapshot.totalFollowing ?? snapshot.following?.length ?? 0,
    mutuals:   snapshot.totalMutuals ?? snapshot.mutuals?.length ?? 0
  });

  const growthRate = prevSnapshot
    ? calculateGrowthRate(
        snapshot.totalFollowers ?? snapshot.followers?.length ?? 0,
        prevSnapshot.totalFollowers ?? prevSnapshot.followers?.length ?? 0
      )
    : null;

  const reciprocityPct = m.isIncomplete ? 0 : Number((m.reciprocity * 100).toFixed(1));

  return (
    <div className="dash-subcard">
      <div className="dash-card-header-row">
        <h3 className="dash-card-title">Network Analytics &amp; Ratios</h3>
        {!m.isIncomplete && (
          <span className="dash-chip-highlight">{reciprocityPct}% Two-Way Reciprocal</span>
        )}
      </div>

      {/* Reciprocity Meter */}
      <div className="analytics-meter-block">
        <div className="meter-label-row">
          <span className="meter-caption">Reciprocity Ratio (Mutuals / Total Following)</span>
          <span className="meter-percentage">{m.isIncomplete ? '—' : `${reciprocityPct}%`}</span>
        </div>
        <div className="meter-track" aria-hidden="true">
          <div className="meter-bar" style={{ width: `${reciprocityPct}%` }} />
        </div>
      </div>

      <table className="dash-table">
        <thead>
          <tr>
            <th>Metric Indicator</th>
            <th style={{ textAlign: 'right' }}>Calculated Value</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Total Follower Audience</td>
            <td className="table-val">{m.totalFollowers.toLocaleString()}</td>
          </tr>
          <tr>
            <td>Total Accounts Followed</td>
            <td className="table-val">{m.totalFollowing.toLocaleString()}</td>
          </tr>
          <tr>
            <td>Two-Way Mutual Connections</td>
            <td className="table-val">{m.isIncomplete ? '—' : m.totalMutuals.toLocaleString()}</td>
          </tr>
          <tr>
            <td>Unreciprocated Following (Not Back)</td>
            <td className="table-val">{m.isIncomplete ? '—' : m.followingOnly.toLocaleString()}</td>
          </tr>
          <tr>
            <td>Audience Fans (Followers Only)</td>
            <td className="table-val">{m.isIncomplete ? '—' : m.followersOnly.toLocaleString()}</td>
          </tr>
          <tr>
            <td>Follower-to-Following Ratio</td>
            <td className="table-val">{m.followRatio.toFixed(2)}</td>
          </tr>
          {growthRate !== null && (
            <tr>
              <td>Follower Growth Delta</td>
              <td className="table-val" style={{ color: growthRate >= 0 ? '#4ade80' : '#f87171' }}>
                {growthRate > 0 ? `+${growthRate}%` : `${growthRate}%`}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
