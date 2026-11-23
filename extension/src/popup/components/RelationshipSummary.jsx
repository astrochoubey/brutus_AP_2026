// RelationshipSummary.jsx — Human-readable summary of the three relationship categories.
//
// Ponytail:
//   Input: { mutuals: 300, notFollowingBack: 120, dontFollowBack: 200 }
//   Output: three rows showing counts and plain-language labels

export default function RelationshipSummary({ summary }) {
  if (!summary) {
    return (
      <div className="rel-summary">
        <div className="rel-row">
          <span>Run a scan to see your relationship breakdown.</span>
        </div>
      </div>
    );
  }

  if (summary.isIncomplete) {
    const missing = summary.followersCount > 0 ? 'Following' : 'Followers';
    return (
      <div className="rel-summary">
        <div className="rel-row">
          <span>Scan your {missing} list to complete mutual &amp; reciprocity analysis.</span>
        </div>
      </div>
    );
  }

  const rows = [
    { label: 'Mutual followers',        count: (summary.mutualsCount ?? 0).toLocaleString() },
    { label: 'Not following me back',   count: (summary.notFollowingBackCount ?? 0).toLocaleString() },
    { label: 'Fans / Not followed back',count: (summary.dontFollowBackCount ?? 0).toLocaleString() },
    { label: 'Reciprocity',             count: `${(summary.reciprocity ?? 0).toFixed(1)}%` }
  ];

  return (
    <div className="rel-summary">
      {rows.map((row) => (
        <div className="rel-row" key={row.label}>
          <span>{row.label}</span>
          <span className="rel-count">{row.count}</span>
        </div>
      ))}
    </div>
  );
}
