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
  const val = (n) => (snapshot && n !== undefined && n !== null ? Number(n).toLocaleString() : '—');

  const totalFollowers = snapshot?.totalFollowers ?? snapshot?.stats?.followersCount ?? snapshot?.followers?.length;
  const totalFollowing = snapshot?.totalFollowing ?? snapshot?.stats?.followingCount ?? snapshot?.following?.length;
  const isIncomplete = !totalFollowers || !totalFollowing;

  const totalMutuals = isIncomplete ? undefined : (snapshot?.totalMutuals ?? snapshot?.stats?.mutualsCount ?? snapshot?.mutuals?.length);
  const notFollowingBack = isIncomplete ? undefined : (
    snapshot?.stats?.notFollowingBackCount ?? (
      totalFollowing !== undefined && totalMutuals !== undefined
        ? Math.max(0, totalFollowing - totalMutuals)
        : undefined
    )
  );

  const cards = [
    { label: 'Followers',           value: val(totalFollowers) },
    { label: 'Following',           value: val(totalFollowing) },
    { label: 'Mutuals',             value: val(totalMutuals) },
    { label: 'Not Following Back',  value: val(notFollowingBack) }
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
