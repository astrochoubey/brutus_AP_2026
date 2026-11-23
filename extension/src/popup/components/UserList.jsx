// UserList.jsx — Renders a filtered and searched list of user cards.
//
// Ponytail:
//   Input: users = [{username:'alice',...}, ...], query = 'ali', filter = 'mutual'
//   Processing: filter by category, then search by username/fullName substring
//   Output: list of matching UserCard components, or EmptyState if none

import UserCard from './UserCard.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import { FILTER, POPUP_USER_LIST_LIMIT } from '../../utils/constants.js';

export default function UserList({ classified, query, filter }) {
  // classified = { mutuals: [...], notFollowingBack: [...], dontFollowBack: [...] }
  if (!classified) {
    return <EmptyState title="No data" description="Run a scan first." />;
  }

  // Step 1: select the right array based on the active filter.
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
    // ALL — combine all categories, each user knows its category
    users = [
      ...(classified.mutuals || []).map((u) => ({ ...u, _cat: 'mutual' })),
      ...(classified.notFollowingBack || []).map((u) => ({ ...u, _cat: 'notFollowingBack' })),
      ...(classified.dontFollowBack || []).map((u) => ({ ...u, _cat: 'dontFollowBack' }))
    ];
  }

  // Step 2: apply text search over username and fullName.
  const q = (query || '').toLowerCase().trim();
  const filtered = q
    ? users.filter((u) =>
        (u.username || '').toLowerCase().includes(q) ||
        (u.fullName || '').toLowerCase().includes(q)
      )
    : users;

  // Step 3: cap output for popup performance.
  const visible = filtered.slice(0, POPUP_USER_LIST_LIMIT);

  if (visible.length === 0) {
    return <EmptyState title="No results" description={q ? `No matches for "${q}"` : 'This category is empty.'} />;
  }

  return (
    <div className="user-list">
      {visible.map((user) => {
        const cat = filter === FILTER.ALL ? user._cat : category;
        return <UserCard key={user.id || user.username} user={user} category={cat} />;
      })}
      {filtered.length > POPUP_USER_LIST_LIMIT && (
        <p style={{ fontSize: '0.72rem', textAlign: 'center', color: '#888', paddingTop: '4px' }}>
          Showing {POPUP_USER_LIST_LIMIT} of {filtered.length}. Open Dashboard for full list.
        </p>
      )}
    </div>
  );
}
