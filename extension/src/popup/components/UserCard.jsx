// UserCard.jsx — Compact, high-density dark row card.

export default function UserCard({ user, category }) {
  const username = user.username || user.id || '';
  const fullName = user.fullName || '';
  const displayName = fullName || username || '?';

  // Extract initials
  const initials = displayName
    .split(/[\s._]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('') || (username[0] ? username[0].toUpperCase() : '?');

  const badgeMap = {
    mutual:           { cls: 'tag-mutual',   label: 'MUTUAL' },
    notFollowingBack: { cls: 'tag-not-back', label: 'NOT BACK' },
    dontFollowBack:   { cls: 'tag-fan',      label: 'FAN' }
  };

  const badge = badgeMap[category] || { cls: 'tag-not-back', label: category };

  return (
    <div className="user-row">
      <div className="user-avatar" aria-hidden="true">
        {initials}
      </div>

      <div className="user-meta">
        <div className="user-handle-line">
          <span className="user-username">@{username}</span>
          <span className={`user-badge ${badge.cls}`}>{badge.label}</span>
        </div>
        {fullName && fullName !== username && (
          <div className="user-fullname">{fullName}</div>
        )}
      </div>

      <a
        href={`https://www.instagram.com/${username}/`}
        target="_blank"
        rel="noreferrer"
        className="user-external-link"
        title={`View @${username} on Instagram`}
        aria-label={`Open @${username} on Instagram`}
      >
        ↗
      </a>
    </div>
  );
}
