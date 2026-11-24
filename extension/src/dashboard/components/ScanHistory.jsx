// ScanHistory.jsx — Structured historical audit record of prior network scans.

import EmptyState from '../../components/EmptyState.jsx';

function formatDateTime(ts) {
  if (!ts) return '—';
  try {
    return new Date(ts).toLocaleString(undefined, {
      month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  } catch {
    return ts;
  }
}

export default function ScanHistory({ scanHistory }) {
  if (!scanHistory || scanHistory.length === 0) {
    return (
      <div className="dash-subcard">
        <h3 className="dash-card-title">Historical Scan Ledger</h3>
        <EmptyState title="No past scans" description="Historical snapshots will be logged here as you run scans." />
      </div>
    );
  }

  const sorted = [...scanHistory].sort(
    (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
  );

  return (
    <div className="dash-subcard">
      <div className="dash-card-header-row">
        <h3 className="dash-card-title">Historical Scan Ledger</h3>
        <span className="dash-badge-count">{sorted.length} Entries</span>
      </div>

      <table className="dash-table">
        <thead>
          <tr>
            <th>Timestamp</th>
            <th>Status</th>
            <th>Captured</th>
            <th style={{ textAlign: 'right' }}>Confidence</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((entry, i) => {
            const statusKey = (entry.status || 'COMPLETE').toLowerCase();
            const collected = entry.collectedCount ?? (entry.totalFollowers ?? entry.followers?.length ?? '—');
            const conf = entry.confidenceScore !== undefined
              ? `${Math.round(entry.confidenceScore * 100)}%`
              : '100%';

            return (
              <tr key={entry.scanId || entry.id || i}>
                <td>{formatDateTime(entry.timestamp)}</td>
                <td>
                  <span className={`table-status-pill status-${statusKey}`}>
                    {entry.status || 'COMPLETE'}
                  </span>
                </td>
                <td className="table-val">
                  {typeof collected === 'number' ? collected.toLocaleString() : collected}
                </td>
                <td className="table-val" style={{ textAlign: 'right' }}>
                  {conf}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
