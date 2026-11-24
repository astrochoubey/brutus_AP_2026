// ScanStatus.jsx — Dark status strip with pulsing amber orb and relative timestamp.

import { SCAN_STATUS } from '../../utils/constants.js';

const STATUS_CONFIG = {
  [SCAN_STATUS.IDLE]:     { dotClass: 'orb-idle',     label: 'READY TO SCAN' },
  [SCAN_STATUS.SCANNING]: { dotClass: 'orb-scanning', label: 'COLLECTING DOM DATA…' },
  [SCAN_STATUS.COMPLETE]: { dotClass: 'orb-complete', label: 'NETWORK SYNCHRONIZED' },
  [SCAN_STATUS.PARTIAL]:  { dotClass: 'orb-partial',  label: 'PARTIAL SCAN' },
  [SCAN_STATUS.FAILED]:   { dotClass: 'orb-failed',   label: 'SCAN INTERRUPTED' },
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
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG[SCAN_STATUS.IDLE];
  const relativeTime = formatRelativeTime(lastScanTime);

  return (
    <div className="status-strip" role="status" aria-live="polite">
      <div className="status-left">
        <span className={`status-orb ${cfg.dotClass}`} aria-hidden="true" />
        <span className="status-title">{cfg.label}</span>
      </div>

      <div className="status-right">
        {detail && <span className="status-detail-tag">{detail}</span>}
        {relativeTime && (
          <span className="status-time" title={new Date(lastScanTime).toLocaleString()}>
            {relativeTime}
          </span>
        )}
      </div>
    </div>
  );
}
