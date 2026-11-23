// Stats.jsx — 2×2 grid of metric cards showing key follower statistics.
//
// Ponytail:
//   Input: { followers: 500, following: 420, mutuals: 300, notFollowingBack: 120 }
//   Output: four cards, each with a number and a label
//
// Rule: if snapshot is null or undefined, every card shows '—' instead of 0.
// This prevents misleading zeros when no scan has been done yet.

export default function Stats({ snapshot }) {
  // Helper: returns formatted number or dash when data is missing
  const val = (n) => (snapshot ? (n ?? 0).toLocaleString() : '—');

  const cards = [
    { label: 'Followers',           value: val(snapshot?.totalFollowers) },
    { label: 'Following',           value: val(snapshot?.totalFollowing) },
    { label: 'Mutuals',             value: val(snapshot?.totalMutuals) },
    { label: 'Not Following Back',  value: val(
        snapshot
          ? Math.max(0, (snapshot.totalFollowing ?? 0) - (snapshot.totalMutuals ?? 0))
          : undefined
      )
    }
  ];

  return (
    <div className="stats-grid">
      {cards.map((card) => (
        <div className="stat-card" key={card.label}>
          <div className="stat-value">{card.value}</div>
          <div className="stat-label">{card.label}</div>
        </div>
      ))}
    </div>
  );
}
