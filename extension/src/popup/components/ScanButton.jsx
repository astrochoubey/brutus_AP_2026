// ScanButton.jsx — Portfolio-styled Multi-State Scan & Restart Action.
//
// 5-State Lifecycle (Mandatory):
//   State 1 (No scan available): "START SCAN"
//   State 2 (Scan in progress):  "SCANNING…" (disabled, gold glow pulse)
//   State 3 (Scan completed):    "SCAN AGAIN" (fresh network scan)
//   State 4 (Partial scan):      "RESTART SCAN" (explains incomplete scan)
//   State 5 (Failed scan):       "TRY AGAIN" (retry failed request)

import { SCAN_STATUS } from '../../utils/constants.js';

export default function ScanButton({
  scanning = false,
  scanStatus = SCAN_STATUS.IDLE,
  hasData = false,
  isPartial = false,
  hasError = false,
  onScan,
  followersCount = 0,
  followingCount = 0
}) {
  let buttonLabel = 'START SCAN';
  let buttonVariant = 'btn-gold';
  let hintText = '';
  let defaultActionType = 'scanFollowers';

  if (scanning) {
    buttonLabel = 'SCANNING…';
    buttonVariant = 'btn-gold is-scanning';
    hintText = 'Extracting network accounts from Instagram. Keep the tab open…';
  } else if (hasError || scanStatus === SCAN_STATUS.FAILED) {
    buttonLabel = 'TRY AGAIN';
    buttonVariant = 'btn-danger';
    hintText = 'Scan interrupted. Ensure your Instagram profile and dialog are open.';
    defaultActionType = followersCount > 0 ? 'scanFollowing' : 'scanFollowers';
  } else if (isPartial || scanStatus === SCAN_STATUS.PARTIAL || (hasData && (followersCount === 0 || followingCount === 0))) {
    buttonLabel = 'RESTART SCAN';
    buttonVariant = 'btn-gold is-restart';
    hintText = followersCount > 0 && followingCount === 0
      ? 'Followers captured. Click to scan Following and complete reciprocity analysis.'
      : 'Incomplete scan. Click Restart Scan to resume full network extraction.';
    defaultActionType = followersCount > 0 && followingCount === 0 ? 'scanFollowing' : 'scanFollowers';
  } else if (hasData || scanStatus === SCAN_STATUS.COMPLETE) {
    buttonLabel = 'SCAN AGAIN';
    buttonVariant = 'btn-gold is-complete';
    hintText = 'Network synchronized. Run another scan to record chronological deltas.';
    defaultActionType = 'scanFollowing';
  } else {
    buttonLabel = 'START SCAN';
    buttonVariant = 'btn-gold';
    hintText = 'Open your profile on Instagram and click Followers or Following before scanning.';
    defaultActionType = 'scanFollowers';
  }

  return (
    <div className="scan-cta-wrapper">
      <div className="scan-hero-box">
        <button
          className={`scan-main-button ${buttonVariant}`}
          onClick={() => onScan(defaultActionType)}
          disabled={scanning}
          type="button"
          aria-label={buttonLabel}
        >
          {scanning ? (
            <span className="btn-content-loading">
              <span className="spinner-dot" aria-hidden="true" />
              <span>SCANNING INSTAGRAM…</span>
            </span>
          ) : (
            <span className="btn-content-idle">
              <span>{buttonLabel}</span>
              <span className="btn-arrow" aria-hidden="true">→</span>
            </span>
          )}
        </button>

        {hintText && (
          <div className="scan-hint-row">
            <span className="hint-bullet" aria-hidden="true">⚡</span>
            <span className="hint-message">{hintText}</span>
          </div>
        )}
      </div>

      {/* Secondary Target Pills */}
      <div className="scan-pill-grid">
        <button
          className="target-pill-btn"
          onClick={() => onScan('scanFollowers')}
          disabled={scanning}
          type="button"
          title="Directly scan only your Followers list"
        >
          👥 FOLLOWERS {followersCount > 0 ? `(${followersCount.toLocaleString()})` : ''}
        </button>
        <button
          className="target-pill-btn"
          onClick={() => onScan('scanFollowing')}
          disabled={scanning}
          type="button"
          title="Directly scan only accounts you Follow"
        >
          🔍 FOLLOWING {followingCount > 0 ? `(${followingCount.toLocaleString()})` : ''}
        </button>
      </div>
    </div>
  );
}
