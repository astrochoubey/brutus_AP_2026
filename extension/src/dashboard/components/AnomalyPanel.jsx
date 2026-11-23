// AnomalyPanel.jsx — Displays anomaly detection results.
//
// When no anomaly data is available (service not implemented yet), shows an empty state.
// When data is provided from the backend /analytics/anomalies endpoint, renders a report.
// Never fabricates anomaly results.

import EmptyState from '../../components/EmptyState.jsx';

export default function AnomalyPanel({ anomaly }) {
  return (
    <div className="dash-card">
      <h2 className="dash-card-title">Anomaly Detection</h2>

      {!anomaly ? (
        <EmptyState
          title="No anomaly data"
          description="Anomaly detection requires the backend service. Connect the backend to see results."
        />
      ) : anomaly.anomaly_detected ? (
        <div className={`anomaly-report risk-${(anomaly.risk_level || 'low').toLowerCase()}`}>
          <strong>⚠ Anomaly Detected</strong>
          <p style={{ marginTop: 6 }}>{anomaly.description}</p>
          <p style={{ marginTop: 4, fontSize: '0.78rem' }}>
            Risk level: <strong>{anomaly.risk_level}</strong> ·{' '}
            Flagged accounts: <strong>{anomaly.flagged_accounts_count}</strong>
          </p>
        </div>
      ) : (
        <div className="anomaly-report risk-none">
          <strong>✓ No anomalies detected</strong>
          <p style={{ marginTop: 4, fontSize: '0.82rem', color: '#555' }}>
            {anomaly.description || 'Your network looks normal.'}
          </p>
        </div>
      )}
    </div>
  );
}
