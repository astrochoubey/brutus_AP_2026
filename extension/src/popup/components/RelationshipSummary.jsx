// RelationshipSummary.jsx — Compact visual reciprocity breakdown with segmented bar.

export default function RelationshipSummary({ summary }) {
  if (!summary) {
    return (
      <div className="rel-card">
        <div className="rel-empty-text">Run a scan to generate reciprocity and relationship analysis.</div>
      </div>
    );
  }

  if (summary.isIncomplete) {
    const missing = summary.followersCount > 0 ? 'Following' : 'Followers';
    return (
      <div className="rel-card is-incomplete">
        <div className="rel-header-row">
          <span className="rel-heading">RELATIONSHIP RECIPROCITY</span>
          <span className="rel-tag-incomplete">INCOMPLETE</span>
        </div>
        <p className="rel-instruction">
          Scan your <strong>{missing}</strong> list to enable complete mutual analysis.
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
    <div className="rel-card">
      <div className="rel-header-row">
        <span className="rel-heading">RELATIONSHIP RECIPROCITY</span>
        <span className="rel-reciprocity-chip">
          {reciprocity}% RECIPROCAL
        </span>
      </div>

      {/* Segmented Distribution Bar */}
      <div className="rel-bar-track" aria-hidden="true">
        <div
          className="rel-bar-seg bar-mutuals"
          style={{ width: `${mutualsPct}%` }}
          title={`Mutuals: ${mutuals.toLocaleString()}`}
        />
        <div
          className="rel-bar-seg bar-following-only"
          style={{ width: `${followingOnlyPct}%` }}
          title={`Not Following Back: ${followingOnly.toLocaleString()}`}
        />
        <div
          className="rel-bar-seg bar-followers-only"
          style={{ width: `${followersOnlyPct}%` }}
          title={`Fans: ${followersOnly.toLocaleString()}`}
        />
      </div>

      {/* Breakdown Legends */}
      <div className="rel-legend-row">
        <div className="legend-chip">
          <span className="swatch swatch-mutuals" />
          <span className="label">Mutuals:</span>
          <span className="value">{mutuals.toLocaleString()}</span>
        </div>
        <div className="legend-chip">
          <span className="swatch swatch-following-only" />
          <span className="label">Following Only:</span>
          <span className="value">{followingOnly.toLocaleString()}</span>
        </div>
        <div className="legend-chip">
          <span className="swatch swatch-followers-only" />
          <span className="label">Fans:</span>
          <span className="value">{followersOnly.toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
}
