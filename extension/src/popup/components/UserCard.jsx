// UserCard.jsx — Single user row showing avatar initials, username, and relationship badge.
//
// Ponytail:
//   Input: user = { username: 'alice', fullName: 'Alice M' }, category = 'mutual'
//   Output: card with "AM" avatar initials, "@alice", "Alice M", green "mutual" badge

export default function UserCard({ user, category }) {
  // Build initials from fullName or fall back to first letter of username.
  const name = user.fullName || user.username || '?';
  const initials = name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');

  // Map category string to badge class and label.
  const badgeInfo = {
    mutual:          { cls: 'mutual',    label: 'Mutual' },
    notFollowingBack:{ cls: 'following', label: 'Not Back' },
    dontFollowBack:  { cls: 'follower',  label: "Fan" }
  };

  const badge = badgeInfo[category] || { cls: 'following', label: category };

  return (
    <div className="user-card">
      <div className="avatar" aria-hidden="true">{initials}</div>
      <div className="user-info">
        <div className="user-username">@{user.username}</div>
        {user.fullName && <div className="user-name">{user.fullName}</div>}
      </div>
      <span className={`rel-badge ${badge.cls}`}>{badge.label}</span>
    </div>
  );
}
