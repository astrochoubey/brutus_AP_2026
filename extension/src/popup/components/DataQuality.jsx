// DataQuality.jsx — Scan integrity, confidence score, sample completeness, and partial warnings.

export default function DataQuality({ scanMeta }) {
  if (!scanMeta) return null;

  const pct = Math.round((scanMeta.confidenceScore ?? 1) * 100);
  const isPartial = scanMeta.status === 'PARTIAL';
  const isFailed  = scanMeta.status === 'FAILED';

  return (
    <div className="data-quality-box" role="region" aria-label="Scan Data Quality">
      <div className="dq-top-row">
        <span className="dq-heading">Scan Integrity</span>
        <span className="dq-confidence-pill">{pct}% Confidence</span>
      </div>

      <div className="dq-meter-track" aria-hidden="true">
        <div
          className={`dq-meter-fill ${isPartial ? 'meter-partial' : 'meter-complete'}`}
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="dq-stat-row">
        <div className="dq-stat-col">
          <span className="dq-stat-sub">Reported</span>
          <span className="dq-stat-val">{(scanMeta.reportedCount ?? 0).toLocaleString()}</span>
        </div>
        <div className="dq-stat-col">
          <span className="dq-stat-sub">Collected</span>
          <span className="dq-stat-val">{(scanMeta.collectedCount ?? 0).toLocaleString()}</span>
        </div>
        {scanMeta.errorCount > 0 && (
          <div className="dq-stat-col">
            <span className="dq-stat-sub">Anomalies</span>
            <span className="dq-stat-val val-error">{scanMeta.errorCount}</span>
          </div>
        )}
      </div>

      {isPartial && (
        <div className="dq-alert dq-alert-partial">
          <span className="dq-alert-icon" aria-hidden="true">⚠️</span>
          <span>Partial scan detected. Results may be incomplete. Use <strong>Restart Scan</strong> to re-attempt full capture.</span>
        </div>
      )}

      {isFailed && (
        <div className="dq-alert dq-alert-failed">
          <span className="dq-alert-icon" aria-hidden="true">✕</span>
          <span>Scan failed to complete. Your existing snapshot was preserved.</span>
        </div>
      )}
    </div>
  );
}
