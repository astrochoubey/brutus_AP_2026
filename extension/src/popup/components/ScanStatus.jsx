// ScanStatus.jsx — Displays the current scan state with a coloured dot.
//
// Ponytail:
//   Input: status = 'PARTIAL', detail = '2,146 / 2,381 collected'
//   Output: orange dot + "PARTIAL" label + detail text

const STATUS_CONFIG = {
  IDLE:     { dot: 'idle',     label: 'No scan yet' },
  SCANNING: { dot: 'scanning', label: 'Scanning…'   },
  COMPLETE: { dot: 'complete', label: 'Complete'     },
  PARTIAL:  { dot: 'partial',  label: 'Partial scan' },
  FAILED:   { dot: 'failed',   label: 'Scan failed'  }
};

export default function ScanStatus({ status = 'IDLE', detail = '' }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.IDLE;

  return (
    <div className="scan-status-wrap" role="status">
      <span className={`status-dot ${config.dot}`} />
      <span className="status-label">{config.label}</span>
      {detail && <span className="status-detail">{detail}</span>}
    </div>
  );
}
