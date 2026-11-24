// RelationshipSummary.jsx — Compact visual reciprocity meter with segmented distribution.
// Clean summary of Mutuals, Following Only, and Follower Only.

export default function RelationshipSummary({ summary }) {
  if (!summary) {
    return (
      <div className="relationship-overview-card">
        <div className="ro-empty-hint">Run a scan to analyze reciprocal connections.</div>
      </div>
    );
  }

  if (summary.isIncomplete) {
    const missing = summary.followersCount > 0 ? 'Following' : 'Followers';
    return (
      <div className="relationship-overview-card incomplete">
        <div className="ro-header-row">
          <span className="ro-title">Relationship Overview</span>
          <span className="ro-incomplete-badge">Incomplete</span>
        </div>
        <p className="ro-guidance">
          Scan your <strong>{missing}</strong> list to enable two-way reciprocity analysis.
        </p>
      </div>
    );
  }

  const mutuals = summary.mutualsCount ?? 0;
  const followingOnly = summary.notFollowingBackCount ?? 0;
  const followersOnly = summary.dontFollowBackCount ?? 0;
  const reciprocity = Number((summary.reciprocity ?? 0).toFixed(1));

  const total = mutuals + followingOnly + followersOnly;
  const mutualsPct = total > 0 ? (mutuals / total) * 100 : 0;
  const followingOnlyPct = total > 0 ? (followingOnly / total) * 100 : 0;
  const followersOnlyPct = total > 0 ? (followersOnly / total) * 100 : 0;

  return (
    <div className="relationship-overview-card">
      <div className="ro-header-row">
        <span className="ro-title">Relationship Overview</span>
        <span className="ro-reciprocity-chip" title="Percentage of accounts you follow who follow you back">
          {reciprocity}% Reciprocity
        </span>
      </div>

      {/* Segmented Distribution Bar */}
      <div className="ro-segmented-bar" aria-hidden="true">
        <div
          className="seg-mutuals"
          style={{ width: `${mutualsPct}%` }}
          title={`Mutuals: ${mutuals.toLocaleString()}`}
        />
        <div
          className="seg-following-only"
          style={{ width: `${followingOnlyPct}%` }}
          title={`Following Only: ${followingOnly.toLocaleString()}`}
        />
        <div
          className="seg-followers-only"
          style={{ width: `${followersOnlyPct}%` }}
          title={`Fans (Followers Only): ${followersOnly.toLocaleString()}`}
        />
      </div>

      {/* Concise Breakdown Legends */}
      <div className="ro-legend-row">
        <div className="legend-item" title="Accounts that both follow you and you follow back">
          <span className="legend-marker marker-mutuals" />
          <span className="legend-label">Mutuals:</span>
          <span className="legend-val">{mutuals.toLocaleString()}</span>
        </div>
        <div className="legend-item" title="Accounts you follow who do not follow back">
          <span className="legend-marker marker-following-only" />
          <span className="legend-label">Following Only:</span>
          <span className="legend-val">{followingOnly.toLocaleString()}</span>
        </div>
        <div className="legend-item" title="Accounts following you whom you do not follow back">
          <span className="legend-marker marker-followers-only" />
          <span className="legend-label">Fans:</span>
          <span className="legend-val">{followersOnly.toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
}
