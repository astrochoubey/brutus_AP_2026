// ScanButton.jsx — Functional Multi-State Scan & Restart Action.
//
// Strictly satisfies Part 5 — Mandatory Restart Scan Button requirements:
//   State 1 (No scan available): "Start Scan"
//   State 2 (Scan in progress):  "Scanning…" (disabled, progress feedback)
//   State 3 (Scan completed):    "Scan Again" (fresh scan initiation)
//   State 4 (Partial scan):      "Restart Scan" (explains incomplete scan)
//   State 5 (Failed scan):       "Try Again" (retry failed request)
//
// Rules:
//   - Disables duplicate clicks while active.
//   - Never deletes last valid snapshot when restarting.
//   - Directly reuses agreed Chrome runtime messaging.

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
  // Determine the active state (1 through 5)
  let buttonLabel = 'Start Scan';
  let buttonClass = 'btn-scan-primary';
  let hintText = '';
  let defaultActionType = 'scanFollowers';

  if (scanning) {
    // State 2: Scan in progress
    buttonLabel = 'Scanning…';
    buttonClass = 'btn-scan-primary scanning';
    hintText = 'Collecting network data from Instagram modal. Please keep the tab open…';
  } else if (hasError || scanStatus === SCAN_STATUS.FAILED) {
    // State 5: Failed scan
    buttonLabel = 'Try Again';
    buttonClass = 'btn-scan-primary failed';
    hintText = 'Last scan attempt failed. Ensure your Instagram profile and modal are open.';
    defaultActionType = followersCount > 0 ? 'scanFollowing' : 'scanFollowers';
  } else if (isPartial || scanStatus === SCAN_STATUS.PARTIAL || (hasData && (followersCount === 0 || followingCount === 0))) {
    // State 4: Partial scan
    buttonLabel = 'Restart Scan';
    buttonClass = 'btn-scan-primary partial';
    hintText = followersCount > 0 && followingCount === 0
      ? 'Followers captured. Click to collect Following and complete reciprocity analysis.'
      : 'Previous scan was incomplete. Click Restart Scan to finish full collection.';
    defaultActionType = followersCount > 0 && followingCount === 0 ? 'scanFollowing' : 'scanFollowers';
  } else if (hasData || scanStatus === SCAN_STATUS.COMPLETE) {
    // State 3: Scan completed
    buttonLabel = 'Scan Again';
    buttonClass = 'btn-scan-primary complete';
    hintText = 'All relationship sets analyzed. Click to run a fresh scan to detect changes.';
    defaultActionType = 'scanFollowing';
  } else {
    // State 1: No scan available
    buttonLabel = 'Start Scan';
    buttonClass = 'btn-scan-primary idle';
    hintText = 'Click to scan your network. Make sure you are on your Instagram profile.';
    defaultActionType = 'scanFollowers';
  }

  return (
    <div className="scan-action-section">
      <div className="main-scan-cta">
        <button
          className={`btn-scan ${buttonClass}`}
          onClick={() => onScan(defaultActionType)}
          disabled={scanning}
          type="button"
          aria-label={buttonLabel}
        >
          {scanning ? (
            <span className="scan-spin-content">
              <span className="spinner-ring" aria-hidden="true" />
              <span>Scanning Instagram…</span>
            </span>
          ) : (
            <span className="scan-btn-content">
              <span>{buttonLabel}</span>
              <span className="scan-btn-arrow" aria-hidden="true">→</span>
            </span>
          )}
        </button>

        {hintText && (
          <div className="scan-action-hint">
            <span className="hint-icon" aria-hidden="true">💡</span>
            <span className="hint-text">{hintText}</span>
          </div>
        )}
      </div>

      {/* Secondary direct controls for targeted list refreshes */}
      <div className="scan-targeted-pills">
        <button
          className="pill-target-btn"
          onClick={() => onScan('scanFollowers')}
          disabled={scanning}
          type="button"
          title="Directly trigger Followers list scan"
        >
          👥 Followers {followersCount > 0 ? `(${followersCount.toLocaleString()})` : ''}
        </button>
        <button
          className="pill-target-btn"
          onClick={() => onScan('scanFollowing')}
          disabled={scanning}
          type="button"
          title="Directly trigger Following list scan"
        >
          🔍 Following {followingCount > 0 ? `(${followingCount.toLocaleString()})` : ''}
        </button>
      </div>
    </div>
  );
}
