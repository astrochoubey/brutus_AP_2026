// ScanStatus.jsx — Refined scan status indicator with last successful scan time and live progress.

import { SCAN_STATUS } from '../../utils/constants.js';

const STATUS_MAP = {
  [SCAN_STATUS.IDLE]:     { dot: 'status-idle',     label: 'Ready to Scan',       badge: 'Idle' },
  [SCAN_STATUS.SCANNING]: { dot: 'status-scanning', label: 'Collecting Network…', badge: 'Active' },
  [SCAN_STATUS.COMPLETE]: { dot: 'status-complete', label: 'Network Synchronized',badge: 'Verified' },
  [SCAN_STATUS.PARTIAL]:  { dot: 'status-partial',  label: 'Partial Data',        badge: 'Incomplete' },
  [SCAN_STATUS.FAILED]:   { dot: 'status-failed',   label: 'Scan Interrupted',    badge: 'Error' },
};

function formatRelativeTime(timestamp) {
  if (!timestamp) return null;
  try {
    const elapsed = Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000);
    if (elapsed < 60) return 'Just now';
    if (elapsed < 3600) return `${Math.floor(elapsed / 60)}m ago`;
    if (elapsed < 86400) return `${Math.floor(elapsed / 3600)}h ago`;
    return new Date(timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  } catch {
    return null;
  }
}

export default function ScanStatus({
  status = SCAN_STATUS.IDLE,
  detail = '',
  lastScanTime = null
}) {
  const cfg = STATUS_MAP[status] || STATUS_MAP[SCAN_STATUS.IDLE];
  const formattedTime = formatRelativeTime(lastScanTime);

  return (
    <div className="scan-status-strip" role="status" aria-live="polite">
      <div className="status-indicator-group">
        <span className={`status-orb ${cfg.dot}`} aria-hidden="true" />
        <span className="status-headline">{cfg.label}</span>
      </div>

      <div className="status-meta-group">
        {detail && <span className="status-detail-chip">{detail}</span>}
        {formattedTime && (
          <span className="status-timestamp" title={new Date(lastScanTime).toLocaleString()}>
            Updated {formattedTime}
          </span>
        )}
      </div>
    </div>
  );
}
