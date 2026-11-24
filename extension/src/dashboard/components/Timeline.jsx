// Timeline.jsx — Chronological historical timeline of stored network scans.

import EmptyState from '../../components/EmptyState.jsx';

function formatDate(ts) {
  if (!ts) return '—';
  try {
    return new Date(ts).toLocaleDateString(undefined, {
      day: 'numeric', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  } catch {
    return ts;
  }
}

export default function Timeline({ scanHistory }) {
  if (!scanHistory || scanHistory.length === 0) {
    return (
      <div className="dash-subcard">
        <h3 className="dash-card-title">Scan Timeline</h3>
        <EmptyState title="No timeline data" description="Historical snapshots will appear here as scans are completed." />
      </div>
    );
  }

  const sorted = [...scanHistory].sort(
    (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
  );

  return (
    <div className="dash-subcard">
      <div className="dash-card-header-row">
        <h3 className="dash-card-title">Chronological Timeline</h3>
        <span className="dash-badge-count">{sorted.length} Snapshots</span>
      </div>

      <div className="timeline-spine">
        {sorted.map((entry, i) => {
          const statusLower = (entry.status || 'COMPLETE').toLowerCase();
          const followers = entry.totalFollowers ?? entry.followers?.length ?? 0;
          const following = entry.totalFollowing ?? entry.following?.length ?? 0;

          return (
            <div className="timeline-node" key={entry.scanId || entry.id || i}>
              <div className={`timeline-orb orb-${statusLower}`} aria-hidden="true" />
              <div className="timeline-content">
                <div className="timeline-meta-row">
                  <span className="tl-timestamp">{formatDate(entry.timestamp)}</span>
                  <span className={`tl-status-pill status-${statusLower}`}>
                    {entry.status || 'COMPLETE'}
                  </span>
                </div>
                <div className="tl-stats-line">
                  <strong>{followers.toLocaleString()}</strong> followers ·{' '}
                  <strong>{following.toLocaleString()}</strong> following
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
