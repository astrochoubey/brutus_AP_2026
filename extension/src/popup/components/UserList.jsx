// UserList.jsx — Compact, high-performance scrollable audience explorer.
//
// Features:
//   - Filter by relationship category
//   - Case-insensitive search on username and full name
//   - Header count indicator (e.g. "Showing 50 of 1,620 accounts")
//   - Helpful empty states if no accounts match

import UserCard from './UserCard.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import { FILTER, POPUP_USER_LIST_LIMIT } from '../../utils/constants.js';

export default function UserList({ classified, query, filter, totalFollowing = 0 }) {
  if (!classified) {
    return (
      <div className="user-list-container">
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
    // ALL — combine accounts prioritizing Not Following Back first
    users = [
      ...(classified.notFollowingBack || []).map((u) => ({ ...u, _cat: 'notFollowingBack' })),
      ...(classified.mutuals || []).map((u) => ({ ...u, _cat: 'mutual' })),
      ...(classified.dontFollowBack || []).map((u) => ({ ...u, _cat: 'dontFollowBack' }))
    ];
  }

  // 2. Apply search filter
  const q = (query || '').toLowerCase().trim();
  const filtered = q
    ? users.filter((u) =>
        (u.username || '').toLowerCase().includes(q) ||
        (u.fullName || '').toLowerCase().includes(q)
      )
    : users;

  // 3. Cap display for popup performance
  const visible = filtered.slice(0, POPUP_USER_LIST_LIMIT);

  if (filtered.length === 0) {
    if (filter === FILTER.NOT_FOLLOWING_BACK && totalFollowing === 0) {
      return (
        <div className="user-list-container">
          <EmptyState
            title="Following list not scanned"
            description="Click 'Restart Scan' or 'Scan Following' to uncover accounts not following back."
          />
        </div>
      );
    }
    return (
      <div className="user-list-container">
        <EmptyState
          title="No accounts found"
          description={q ? `No accounts matched "${q}"` : 'This category contains 0 accounts.'}
        />
      </div>
    );
  }

  return (
    <div className="user-list-container">
      <div className="user-list-status-bar">
        <span className="count-label">
          {q ? `Found ${filtered.length} matching` : `Showing ${visible.length} of ${filtered.length.toLocaleString()} accounts`}
        </span>
      </div>

      <div className="user-card-scroll-area">
        {visible.map((user) => {
          const cat = filter === FILTER.ALL ? user._cat : category;
          return <UserCard key={user.id || user.username} user={user} category={cat} />;
        })}
      </div>

      {filtered.length > POPUP_USER_LIST_LIMIT && (
        <div className="user-list-footer-note">
          Showing top {POPUP_USER_LIST_LIMIT} accounts. Open <strong>Dashboard</strong> for full network analytics.
        </div>
      )}
    </div>
  );
}
