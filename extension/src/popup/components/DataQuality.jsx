// DataQuality.jsx — Shows scan completeness score, counts, errors, and a partial-scan warning.
//
// Ponytail:
//   Input: scanMeta = { reportedCount: 2381, collectedCount: 2146, confidenceScore: 0.9, status: 'PARTIAL', ... }
//   Output: confidence bar, row with reported vs collected, warning box if PARTIAL

export default function DataQuality({ scanMeta }) {
  if (!scanMeta) return null;

  const pct = Math.round((scanMeta.confidenceScore ?? 0) * 100);
  const isPartial = scanMeta.status === 'PARTIAL';
  const isFailed  = scanMeta.status === 'FAILED';

  return (
    <div className="data-quality">
      <div className="dq-title">Data Quality</div>

      <div className="dq-row">
        <span>Confidence</span>
        <span>{pct}%</span>
      </div>

      <div className="confidence-bar-wrap">
        <div className="confidence-bar" style={{ width: `${pct}%` }} />
      </div>

      <div className="dq-row" style={{ marginTop: 6 }}>
        <span>Reported</span>
        <span>{(scanMeta.reportedCount ?? 0).toLocaleString()}</span>
      </div>
      <div className="dq-row">
        <span>Collected</span>
        <span>{(scanMeta.collectedCount ?? 0).toLocaleString()}</span>
      </div>
      {scanMeta.errorCount > 0 && (
        <div className="dq-row">
          <span>Errors</span>
          <span style={{ color: '#e53935' }}>{scanMeta.errorCount}</span>
        </div>
      )}

      {isPartial && (
        <div className="partial-warning">
          ⚠ This scan is incomplete. Results may be inaccurate and will not overwrite previous data.
        </div>
      )}
      {isFailed && (
        <div className="partial-warning" style={{ borderColor: '#e53935', background: '#fdecea', color: '#c62828' }}>
          ✕ Scan failed. No data was collected.
        </div>
      )}
    </div>
  );
}
