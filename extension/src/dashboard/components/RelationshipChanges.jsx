// RelationshipChanges.jsx — Shows what changed between two snapshots.
//
// Uses computeSnapshotDiff() from comparison.js — no duplicate logic here.
//
// Ponytail:
//   prev.followers = [A, B], curr.followers = [A, C]
//   lostFollowers = [B], newFollowers = [C]

import { computeSnapshotDiff } from '../../utils/comparison.js';
import EmptyState from '../../components/EmptyState.jsx';

const CHANGE_LABEL = {
  newFollowers:  { cls: 'new-follower',  label: 'New Follower' },
  lostFollowers: { cls: 'lost-follower', label: 'Lost Follower' },
  newFollowing:  { cls: 'new-following', label: 'New Following' },
  unfollowed:    { cls: 'unfollowed',    label: 'Unfollowed' }
};

export default function RelationshipChanges({ currentSnapshot, prevSnapshot }) {
  if (!currentSnapshot || !prevSnapshot) {
    return (
      <div className="dash-card">
        <h2 className="dash-card-title">Relationship Changes</h2>
        <EmptyState
          title="Need two snapshots"
          description="Run at least two scans to see what changed between them."
        />
      </div>
    );
  }

  // Compute the diff using existing utility.
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
      <div className="dash-card">
        <h2 className="dash-card-title">Relationship Changes</h2>
        <EmptyState title="No changes detected" description="Your network looks the same as the previous snapshot." />
      </div>
    );
  }

  return (
    <div className="dash-card">
      <h2 className="dash-card-title">Relationship Changes</h2>
      <div className="changes-list">
        {allChanges.map((c, i) => (
          <div className="change-row" key={`${c.type}-${c.user.id || c.user.username}-${i}`}>
            <span className={`change-type ${c.cls}`}>{c.label}</span>
            <span className="change-username">@{c.user.username}</span>
            {c.user.fullName && (
              <span style={{ color: '#888', fontSize: '0.78rem' }}>{c.user.fullName}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
