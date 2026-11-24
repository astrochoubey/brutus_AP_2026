// Stats.jsx — Balanced 2×2 metric grid with serif figures and interactive filter hooks.
//
// Requirements:
//   1. Total Followers
//   2. Total Following
//   3. Mutual Followers
//   4. Not Following Back
//   - Each card: small title, visible number, subtle visual treatment, clickable filter.

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
      active: activeFilter === FILTER.ALL,
      tag: 'Audience'
    },
    {
      id: 'following',
      filter: FILTER.NOT_FOLLOWING_BACK,
      label: 'Following',
      value: val(totalFollowing),
      active: false,
      tag: 'Network'
    },
    {
      id: 'mutuals',
      filter: FILTER.MUTUALS,
      label: 'Mutual Followers',
      value: val(totalMutuals),
      active: activeFilter === FILTER.MUTUALS,
      tag: 'Two-Way'
    },
    {
      id: 'notFollowingBack',
      filter: FILTER.NOT_FOLLOWING_BACK,
      label: 'Not Following Back',
      value: val(notFollowingBack),
      active: activeFilter === FILTER.NOT_FOLLOWING_BACK,
      tag: 'One-Way',
      isAlert: !isIncomplete && notFollowingBack > 0
    }
  ];

  return (
    <div className="stats-metric-grid" role="region" aria-label="Key Instagram Network Metrics">
      {cards.map((card) => (
        <button
          key={card.id}
          type="button"
          className={`metric-tile ${card.active ? 'active-tile' : ''} ${card.isAlert ? 'alert-tile' : ''}`}
          onClick={() => onSelectFilter && onSelectFilter(card.filter)}
          title={`Filter audience list by ${card.label}`}
        >
          <div className="metric-header-row">
            <span className="metric-title">{card.label}</span>
            <span className="metric-tag">{card.tag}</span>
          </div>
          <div className="metric-number">{card.value}</div>
        </button>
      ))}
    </div>
  );
}
