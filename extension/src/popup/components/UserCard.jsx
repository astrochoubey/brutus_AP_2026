// UserCard.jsx — Compact, high-density user card with initials avatar, verified handle, and Instagram link.

export default function UserCard({ user, category }) {
  const username = user.username || user.id || '';
  const fullName = user.fullName || '';
  const displayName = fullName || username || '?';

  // Build 1-2 character initials
  const initials = displayName
    .split(/[\s._]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('') || (username[0] ? username[0].toUpperCase() : '?');

  const badgeConfig = {
    mutual:           { cls: 'badge-mutual',    label: 'Mutual' },
    notFollowingBack: { cls: 'badge-not-back',  label: 'Not Back' },
    dontFollowBack:   { cls: 'badge-fan',       label: 'Fan' }
  };

  const badge = badgeConfig[category] || { cls: 'badge-not-back', label: category };

  return (
    <div className="user-row-card">
      <div className="user-avatar-circle" aria-hidden="true">
        {initials}
      </div>

      <div className="user-details">
        <div className="user-primary-row">
          <span className="user-handle">@{username}</span>
          <span className={`user-category-tag ${badge.cls}`}>{badge.label}</span>
        </div>
        {fullName && fullName !== username && (
          <div className="user-fullname">{fullName}</div>
        )}
      </div>

      <a
        href={`https://www.instagram.com/${username}/`}
        target="_blank"
        rel="noreferrer"
        className="user-link-out"
        title={`View @${username} on Instagram (opens in new tab)`}
        aria-label={`Open @${username} on Instagram`}
      >
        ↗
      </a>
    </div>
  );
}
