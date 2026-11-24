// UserCard.jsx — Single user row showing avatar initials, username, relationship badge, and profile link.
//
// Ponytail:
//   Input: user = { username: 'alice', fullName: 'Alice M' }, category = 'mutual'
//   Output: card with initials avatar, @username, fullName, category badge, and external link ↗

export default function UserCard({ user, category }) {
  const username = user.username || user.id || '';
  const fullName = user.fullName || '';
  const displayName = fullName || username || '?';

  // Extract up to 2 letters for initials
  const initials = displayName
    .split(/[\s._]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('') || (username[0] ? username[0].toUpperCase() : '?');

  const badgeInfo = {
    mutual:           { cls: 'mutual',    label: '✓ Mutual' },
    notFollowingBack: { cls: 'following', label: 'Not Back' },
    dontFollowBack:   { cls: 'follower',  label: 'Fan' }
  };

  const badge = badgeInfo[category] || { cls: 'following', label: category };

  return (
    <div className="user-card">
      <div className="avatar" aria-hidden="true">{initials}</div>
      <div className="user-info">
        <div className="user-username">@{username}</div>
        {fullName && fullName !== username && (
          <div className="user-name">{fullName}</div>
        )}
      </div>
      <span className={`rel-badge ${badge.cls}`}>{badge.label}</span>
      <a
        href={`https://www.instagram.com/${username}/`}
        target="_blank"
        rel="noreferrer"
        className="user-profile-link"
        title={`View @${username} on Instagram`}
      >
        ↗
      </a>
    </div>
  );
}
