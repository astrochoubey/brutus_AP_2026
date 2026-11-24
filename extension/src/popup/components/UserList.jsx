// UserList.jsx — High-performance scrollable audience explorer.

import UserCard from './UserCard.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import { FILTER, POPUP_USER_LIST_LIMIT } from '../../utils/constants.js';

export default function UserList({ classified, query, filter, totalFollowing = 0 }) {
  if (!classified) {
    return (
      <div className="user-list-wrapper">
        <EmptyState title="No accounts loaded" description="Run a scan to populate your Instagram audience." />
      </div>
    );
  }

  // 1. Select accounts for current filter
  let users = [];
  let category = 'mutual';

  if (filter === FILTER.MUTUALS) {
    users = classified.mutuals || [];
    category = 'mutual';
  } else if (filter === FILTER.NOT_FOLLOWING_BACK) {
    users = classified.notFollowingBack || [];
    category = 'notFollowingBack';
  } else if (filter === FILTER.DONT_FOLLOW_BACK) {
    users = classified.dontFollowBack || [];
    category = 'dontFollowBack';
  } else {
    // ALL — combine accounts prioritizing Not Following Back
    users = [
      ...(classified.notFollowingBack || []).map((u) => ({ ...u, _cat: 'notFollowingBack' })),
      ...(classified.mutuals || []).map((u) => ({ ...u, _cat: 'mutual' })),
      ...(classified.dontFollowBack || []).map((u) => ({ ...u, _cat: 'dontFollowBack' }))
    ];
  }

  // 2. Case-insensitive search
  const q = (query || '').toLowerCase().trim();
  const filtered = q
    ? users.filter((u) =>
        (u.username || '').toLowerCase().includes(q) ||
        (u.fullName || '').toLowerCase().includes(q)
      )
    : users;

  const visible = filtered.slice(0, POPUP_USER_LIST_LIMIT);

  if (filtered.length === 0) {
    if (filter === FILTER.NOT_FOLLOWING_BACK && totalFollowing === 0) {
      return (
        <div className="user-list-wrapper">
          <EmptyState
            title="Following list pending"
            description="Click 'Restart Scan' to scan accounts you follow and find who doesn't follow back."
          />
        </div>
      );
    }
    return (
      <div className="user-list-wrapper">
        <EmptyState
          title="No matching accounts"
          description={q ? `No accounts matched "${q}"` : 'This category contains 0 accounts.'}
        />
      </div>
    );
  }

  return (
    <div className="user-list-wrapper">
      <div className="user-list-count-header">
        <span>{q ? `FOUND ${filtered.length} MATCHES` : `SHOWING ${visible.length} OF ${filtered.length.toLocaleString()} ACCOUNTS`}</span>
      </div>

      <div className="user-list-scroller">
        {visible.map((user) => {
          const cat = filter === FILTER.ALL ? user._cat : category;
          return <UserCard key={user.id || user.username} user={user} category={cat} />;
        })}
      </div>

      {filtered.length > POPUP_USER_LIST_LIMIT && (
        <div className="user-list-footer">
          Showing top {POPUP_USER_LIST_LIMIT} accounts. Open <strong>Dashboard</strong> for complete observatory explorer.
        </div>
      )}
    </div>
  );
}
