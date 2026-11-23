/**
 * Brutus – Instagram Network Observatory
 * Message type constants exchanged across runtime contexts.
 */

export const MESSAGE_TYPES = Object.freeze({
  SCAN_FOLLOWERS: 'scanFollowers',
  SCAN_FOLLOWING: 'scanFollowing',
  FOLLOWERS_DATA: 'followersData',
  FOLLOWING_DATA: 'followingData',
  CREATE_SNAPSHOT: 'createSnapshot',
  GET_LATEST_SNAPSHOT: 'getLatestSnapshot',
  GET_SNAPSHOTS: 'getSnapshots',
  GET_SNAPSHOT_HISTORY: 'getSnapshotHistory',
  CLEAR_SNAPSHOTS: 'clearSnapshots',
  GET_PENDING_DATA: 'getPendingData',
  CALCULATE_RELATIONSHIPS: 'calculateRelationships',
});
