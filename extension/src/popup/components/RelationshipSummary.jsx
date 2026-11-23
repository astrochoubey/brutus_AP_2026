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

  const rows = [
    { label: 'Mutual connections',   count: summary.mutualsCount ?? 0 },
    { label: 'Not following back',   count: summary.notFollowingBackCount ?? 0 },
    { label: 'Don\'t follow back',   count: summary.dontFollowBackCount ?? 0 }
  ];

  return (
    <div className="rel-summary">
      {rows.map((row) => (
        <div className="rel-row" key={row.label}>
          <span>{row.label}</span>
          <span className="rel-count">{row.count.toLocaleString()}</span>
        </div>
      ))}
    </div>
  );
}
