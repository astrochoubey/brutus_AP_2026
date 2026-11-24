// ScanButton.jsx — Intelligent multi-mode trigger for Instagram scan operations.
//
// Features:
// 1. Contextual primary button (knows whether Step 1: Followers or Step 2: Following is needed).
// 2. Direct quick-action buttons for Followers and Following so the user is never blocked.
// 3. Disables while active scan is running to prevent duplicate triggers.

export default function ScanButton({
  scanning,
  onScan,
  followersCount = 0,
  followingCount = 0
}) {
  const hasFollowers = followersCount > 0;
  const hasFollowing = followingCount > 0;

  // Derive smart primary recommendation
  let primaryLabel = 'Scan Followers';
  let primaryType = 'scanFollowers';
  let subHint = '';

  if (hasFollowers && !hasFollowing) {
    primaryLabel = '🔍 Scan Following (Step 2)';
    primaryType = 'scanFollowing';
    subHint = 'Followers captured. Now scan your Following list to uncover non-reciprocal accounts.';
  } else if (!hasFollowers && hasFollowing) {
    primaryLabel = '👥 Scan Followers (Step 2)';
    primaryType = 'scanFollowers';
    subHint = 'Following captured. Now scan your Followers to complete mutual reciprocity.';
  } else if (hasFollowers && hasFollowing) {
    primaryLabel = '🔄 Refresh Scan (Following)';
    primaryType = 'scanFollowing';
  } else {
    primaryLabel = '👥 Scan Followers (Step 1)';
    primaryType = 'scanFollowers';
    subHint = 'Open your profile on Instagram and click Followers or Following before scanning.';
  }

  return (
    <div className="scan-controls">
      <button
        className="btn-scan"
        onClick={() => onScan(primaryType)}
        disabled={scanning}
        type="button"
      >
        {scanning ? 'Scanning Instagram…' : primaryLabel}
      </button>

      {subHint && !scanning && (
        <div className="scan-hint">{subHint}</div>
      )}

      <div className="scan-secondary-row">
        <button
          className="btn-scan-secondary"
          onClick={() => onScan('scanFollowers')}
          disabled={scanning}
          type="button"
          title="Directly trigger Followers list scan"
        >
          👥 Followers {hasFollowers ? `(${followersCount.toLocaleString()})` : ''}
        </button>
        <button
          className="btn-scan-secondary"
          onClick={() => onScan('scanFollowing')}
          disabled={scanning}
          type="button"
          title="Directly trigger Following list scan"
        >
          🔍 Following {hasFollowing ? `(${followingCount.toLocaleString()})` : ''}
        </button>
      </div>
    </div>
  );
}
