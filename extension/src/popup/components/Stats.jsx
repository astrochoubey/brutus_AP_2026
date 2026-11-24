// Stats.jsx — Interactive 2×2 grid of metric cards showing key relationship metrics.
//
// Ponytail:
//   Input: { snapshot, activeFilter, onSelectFilter }
//   Output: four interactive metric cards that trigger corresponding user filters.
//   Rule: if a metric is unavailable, show '—' instead of deceptive 0.

import { FILTER } from '../../utils/constants.js';

export default function Stats({ snapshot, activeFilter, onSelectFilter }) {
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
    {
      id: 'followers',
      filter: FILTER.ALL,
      label: 'Followers',
      value: val(totalFollowers),
      active: activeFilter === FILTER.ALL
    },
    {
      id: 'following',
      filter: FILTER.NOT_FOLLOWING_BACK,
      label: 'Following',
      value: val(totalFollowing),
      active: false
    },
    {
      id: 'mutuals',
      filter: FILTER.MUTUALS,
      label: 'Mutuals',
      value: val(totalMutuals),
      active: activeFilter === FILTER.MUTUALS
    },
    {
      id: 'notFollowingBack',
      filter: FILTER.NOT_FOLLOWING_BACK,
      label: 'Not Following Back',
      value: val(notFollowingBack),
      active: activeFilter === FILTER.NOT_FOLLOWING_BACK,
      highlight: true
    }
  ];

  return (
    <div className="stats-grid">
      {cards.map((card) => (
        <button
          key={card.id}
          type="button"
          className={`stat-card ${card.active ? 'active' : ''} ${card.highlight ? 'highlight-card' : ''}`}
          onClick={() => onSelectFilter && onSelectFilter(card.filter)}
          title={`Click to filter user list by ${card.label}`}
        >
          <div className="stat-value">{card.value}</div>
          <div className="stat-label">{card.label}</div>
        </button>
      ))}
    </div>
  );
}
