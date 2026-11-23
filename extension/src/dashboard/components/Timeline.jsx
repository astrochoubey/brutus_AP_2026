// Timeline.jsx — Chronological list of stored snapshots.
//
// Ponytail:
//   Input: scanHistory = [{ scanId, timestamp, status, followers, following }, ...]
//   Output: timeline entries sorted newest-first, each showing date and status badge.

import EmptyState from '../../components/EmptyState.jsx';

function formatDate(ts) {
  if (!ts) return '—';
  try {
    return new Date(ts).toLocaleDateString(undefined, {
      day: 'numeric', month: 'short', year: 'numeric'
    });
  } catch {
    return ts;
  }
}

export default function Timeline({ scanHistory }) {
  if (!scanHistory || scanHistory.length === 0) {
    return (
      <div className="dash-card">
        <h2 className="dash-card-title">Timeline</h2>
        <EmptyState title="No scan history" description="Your scan history will appear here after you run scans." />
      </div>
    );
  }

  // Sort newest first.
  const sorted = [...scanHistory].sort(
    (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
  );

  return (
    <div className="dash-card">
      <h2 className="dash-card-title">Timeline</h2>
      <div className="timeline-list">
        {sorted.map((entry, i) => {
          const badgeCls = (entry.status || '').toLowerCase();
          return (
            <div className="timeline-entry" key={entry.scanId || i}>
              <div className="timeline-dot" />
              <span className="tl-date">{formatDate(entry.timestamp)}</span>
              <span className="tl-label">
                {(entry.totalFollowers ?? 0).toLocaleString()} followers ·{' '}
                {(entry.totalFollowing ?? 0).toLocaleString()} following
              </span>
              <span className={`tl-badge ${badgeCls}`}>
                {entry.status || 'COMPLETE'}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
