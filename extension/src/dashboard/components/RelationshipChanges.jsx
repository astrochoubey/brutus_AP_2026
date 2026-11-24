// RelationshipChanges.jsx — Visual delta analysis between two valid snapshots.
// Computes new followers, lost followers, new following, and unfollowed accounts.

import { computeSnapshotDiff } from '../../utils/comparison.js';
import EmptyState from '../../components/EmptyState.jsx';

const CHANGE_LABEL = {
  newFollowers:  { cls: 'delta-new-follower',  label: '+ New Follower' },
  lostFollowers: { cls: 'delta-lost-follower', label: '- Lost Follower' },
  newFollowing:  { cls: 'delta-new-following', label: '+ New Following' },
  unfollowed:    { cls: 'delta-unfollowed',    label: '- Unfollowed' }
};

export default function RelationshipChanges({ currentSnapshot, prevSnapshot }) {
  if (!currentSnapshot || !prevSnapshot) {
    return (
      <div className="dash-subcard">
        <h3 className="dash-card-title">Relationship Changes</h3>
        <EmptyState
          title="Baseline snapshot established"
          description="A minimum of two sequential scans is required to detect follower and following deltas."
        />
      </div>
    );
  }

  const diff = computeSnapshotDiff(
    prevSnapshot.followers    || [],
    currentSnapshot.followers || [],
    prevSnapshot.following    || [],
    currentSnapshot.following || []
  );

  const allChanges = [];
  for (const [key, users] of Object.entries(diff)) {
    const info = CHANGE_LABEL[key];
    if (!info) continue;
    for (const u of users) {
      allChanges.push({ type: key, user: u, ...info });
    }
  }

  if (allChanges.length === 0) {
    return (
      <div className="dash-subcard">
        <h3 className="dash-card-title">Relationship Changes</h3>
        <EmptyState
          title="Stable Network"
          description="No follower or following changes were observed between the last two scans."
        />
      </div>
    );
  }

  return (
    <div className="dash-subcard">
      <div className="dash-card-header-row">
        <h3 className="dash-card-title">Relationship Changes</h3>
        <span className="dash-badge-count">{allChanges.length} Changes Detected</span>
      </div>

      <div className="changes-feed-list">
        {allChanges.slice(0, 30).map((c, i) => (
          <div className="change-feed-item" key={`${c.type}-${c.user.id || c.user.username}-${i}`}>
            <span className={`delta-tag ${c.cls}`}>{c.label}</span>
            <span className="delta-user-handle">@{c.user.username}</span>
            {c.user.fullName && (
              <span className="delta-user-fullname">{c.user.fullName}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
