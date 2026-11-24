// Stats.jsx — Portfolio-styled 2×2 metric grid with high-contrast numbers and interactive filters.

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
      label: 'TOTAL FOLLOWERS',
      value: val(totalFollowers),
      active: activeFilter === FILTER.ALL,
      tag: 'AUDIENCE'
    },
    {
      id: 'following',
      filter: FILTER.NOT_FOLLOWING_BACK,
      label: 'TOTAL FOLLOWING',
      value: val(totalFollowing),
      active: false,
      tag: 'NETWORK'
    },
    {
      id: 'mutuals',
      filter: FILTER.MUTUALS,
      label: 'MUTUAL FOLLOWERS',
      value: val(totalMutuals),
      active: activeFilter === FILTER.MUTUALS,
      tag: 'TWO-WAY'
    },
    {
      id: 'notFollowingBack',
      filter: FILTER.NOT_FOLLOWING_BACK,
      label: 'NOT FOLLOWING BACK',
      value: val(notFollowingBack),
      active: activeFilter === FILTER.NOT_FOLLOWING_BACK,
      tag: 'ONE-WAY',
      isAlert: !isIncomplete && notFollowingBack > 0
    }
  ];

  return (
    <div className="stats-2x2-grid" role="region" aria-label="Key Relationship Metrics">
      {cards.map((card) => (
        <button
          key={card.id}
          type="button"
          className={`stat-tile ${card.active ? 'is-active' : ''} ${card.isAlert ? 'is-alert' : ''}`}
          onClick={() => onSelectFilter && onSelectFilter(card.filter)}
          title={`Filter list by ${card.label}`}
        >
          <div className="stat-tile-top">
            <span className="stat-tile-label">{card.label}</span>
            <span className="stat-tile-tag">{card.tag}</span>
          </div>
          <div className="stat-tile-num">{card.value}</div>
        </button>
      ))}
    </div>
  );
}
