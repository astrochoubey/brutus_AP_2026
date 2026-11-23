// ScanHistory.jsx — Table of past scans with timestamps and quality info.

import EmptyState from '../../components/EmptyState.jsx';

function formatDateTime(ts) {
  if (!ts) return '—';
  try {
    return new Date(ts).toLocaleString(undefined, {
      day: 'numeric', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  } catch {
    return ts;
  }
}

export default function ScanHistory({ scanHistory }) {
  if (!scanHistory || scanHistory.length === 0) {
    return (
      <div className="dash-card">
        <h2 className="dash-card-title">Scan History</h2>
        <EmptyState title="No scans yet" description="Run your first scan to populate history." />
      </div>
    );
  }

  const sorted = [...scanHistory].sort(
    (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
  );

  return (
    <div className="dash-card">
      <h2 className="dash-card-title">Scan History</h2>
      <table className="scan-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Status</th>
            <th>Collected</th>
            <th>Confidence</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((entry, i) => (
            <tr key={entry.scanId || i}>
              <td>{formatDateTime(entry.timestamp)}</td>
              <td>{entry.status || '—'}</td>
              <td>{(entry.collectedCount ?? '—').toLocaleString()}</td>
              <td>
                {entry.confidenceScore !== undefined
                  ? `${Math.round(entry.confidenceScore * 100)}%`
                  : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
