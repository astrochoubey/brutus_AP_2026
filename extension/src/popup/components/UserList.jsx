// UserList.jsx — Renders filtered and searched list of user accounts.
//
// Ponytail:
//   Input: classified = { mutuals, notFollowingBack, dontFollowBack }, query = 'ali', filter = 'notFollowingBack'
//   Processing: filter by relationship category, then filter by username/fullName substring
//   Output: list of matching UserCard items, or helpful EmptyState message

import UserCard from './UserCard.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import { FILTER, POPUP_USER_LIST_LIMIT } from '../../utils/constants.js';

export default function UserList({ classified, query, filter, totalFollowing = 0 }) {
  if (!classified) {
    return <EmptyState title="No data yet" description="Scan followers and following to view your relationships." />;
  }

  // Step 1: select accounts based on the active filter
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
    // ALL — combine accounts, prioritizing non-reciprocal followed accounts first
    users = [
      ...(classified.notFollowingBack || []).map((u) => ({ ...u, _cat: 'notFollowingBack' })),
      ...(classified.mutuals || []).map((u) => ({ ...u, _cat: 'mutual' })),
      ...(classified.dontFollowBack || []).map((u) => ({ ...u, _cat: 'dontFollowBack' }))
    ];
  }

  // Step 2: apply case-insensitive text search over username and fullName
  const q = (query || '').toLowerCase().trim();
  const filtered = q
    ? users.filter((u) =>
        (u.username || '').toLowerCase().includes(q) ||
        (u.fullName || '').toLowerCase().includes(q)
      )
    : users;

  // Step 3: cap output for smooth popup performance
  const visible = filtered.slice(0, POPUP_USER_LIST_LIMIT);

  if (filtered.length === 0) {
    if (filter === FILTER.NOT_FOLLOWING_BACK && totalFollowing === 0) {
      return (
        <EmptyState
          title="Following not scanned yet"
          description="Click 'Scan Following' to find people you follow who don't follow back."
        />
      );
    }
    return (
      <EmptyState
        title="No results"
        description={q ? `No accounts match "${q}"` : 'This category has no accounts.'}
      />
    );
  }

  return (
    <div className="user-list-section">
      <div className="user-list-header">
        <span className="user-list-count">
          {q ? `Matches: ${filtered.length}` : `Accounts: ${visible.length} of ${filtered.length.toLocaleString()}`}
        </span>
      </div>
      <div className="user-list">
        {visible.map((user) => {
          const cat = filter === FILTER.ALL ? user._cat : category;
          return <UserCard key={user.id || user.username} user={user} category={cat} />;
        })}
      </div>
      {filtered.length > POPUP_USER_LIST_LIMIT && (
        <p className="user-list-footnote">
          Showing first {POPUP_USER_LIST_LIMIT} of {filtered.length.toLocaleString()} accounts. Open Dashboard for complete explorer.
        </p>
      )}
    </div>
  );
}
