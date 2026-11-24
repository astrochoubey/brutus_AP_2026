// DataQuality.jsx — Scan data integrity and sample completeness card.

export default function DataQuality({ scanMeta }) {
  if (!scanMeta) return null;

  const pct = Math.round((scanMeta.confidenceScore ?? 1) * 100);
  const isPartial = scanMeta.status === 'PARTIAL';
  const isFailed  = scanMeta.status === 'FAILED';

  return (
    <div className="quality-card" role="region" aria-label="Scan Data Quality">
      <div className="quality-header">
        <span className="quality-title">Data Integrity Audit</span>
        <span className="quality-confidence-chip">{pct}% Confidence</span>
      </div>

      <div className="quality-bar-track" aria-hidden="true">
        <div
          className={`quality-bar-fill ${isPartial ? 'bar-partial' : 'bar-complete'}`}
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="quality-metrics-row">
        <div className="quality-metric">
          <span className="q-label">Reported:</span>
          <span className="q-val">{(scanMeta.reportedCount ?? 0).toLocaleString()}</span>
        </div>
        <div className="quality-metric">
          <span className="q-label">Collected:</span>
          <span className="q-val">{(scanMeta.collectedCount ?? 0).toLocaleString()}</span>
        </div>
        {scanMeta.errorCount > 0 && (
          <div className="quality-metric">
            <span className="q-label">Anomalies:</span>
            <span className="q-val val-alert">{scanMeta.errorCount}</span>
          </div>
        )}
      </div>

      {isPartial && (
        <div className="quality-warning">
          <span aria-hidden="true">⚠️</span>
          <span>Incomplete sample. Use <strong>Restart Scan</strong> to run full extraction.</span>
        </div>
      )}

      {isFailed && (
        <div className="quality-warning is-failed">
          <span aria-hidden="true">✕</span>
          <span>Scan failed to complete. Existing snapshot was preserved.</span>
        </div>
      )}
    </div>
  );
}
