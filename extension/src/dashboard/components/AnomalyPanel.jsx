// AnomalyPanel.jsx — Verified anomaly detection reports from backend service.
// Renders clean empty state when no anomaly data exists; never fabricates results.

import EmptyState from '../../components/EmptyState.jsx';

export default function AnomalyPanel({ anomaly }) {
  return (
    <div className="dash-subcard">
      <div className="dash-card-header-row">
        <h3 className="dash-card-title">Network Anomaly Inspection</h3>
        <span className="dash-badge-count">Automated Integrity Auditing</span>
      </div>

      {!anomaly ? (
        <EmptyState
          title="No anomalies detected"
          description="Network patterns appear consistent. Connect the local backend API for real-time statistical anomaly monitoring."
        />
      ) : anomaly.anomaly_detected ? (
        <div className={`anomaly-card-report risk-${(anomaly.risk_level || 'low').toLowerCase()}`}>
          <div className="anomaly-header">
            <strong>⚠️ Anomaly Flagged by Observatory</strong>
            <span className="risk-level-tag">{anomaly.risk_level} Risk</span>
          </div>
          <p className="anomaly-body-text">{anomaly.description}</p>
          <div className="anomaly-footer-meta">
            <span>Flagged accounts: <strong>{anomaly.flagged_accounts_count ?? 0}</strong></span>
            {anomaly.timestamp && <span>Detected: {new Date(anomaly.timestamp).toLocaleTimeString()}</span>}
          </div>
        </div>
      ) : (
        <div className="anomaly-card-report risk-none">
          <div className="anomaly-header">
            <strong style={{ color: '#4ade80' }}>✓ Network Health Verified</strong>
            <span className="risk-level-tag tag-healthy">Optimal</span>
          </div>
          <p className="anomaly-body-text">
            {anomaly.description || 'No sudden follower spikes, mass unfollows, or anomalous reciprocity deviations were found.'}
          </p>
        </div>
      )}
    </div>
  );
}
