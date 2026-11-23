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

// Also export MSG mapping for UI components
export const MSG = Object.freeze({
  START_SCAN: 'scanFollowers',
  SCAN_PROGRESS: 'SCAN_PROGRESS',
  SCAN_COMPLETE: 'SCAN_COMPLETE',
  GET_SNAPSHOT: 'getLatestSnapshot',
  SNAPSHOT_DATA: 'SNAPSHOT_DATA',
  GET_SCAN_HISTORY: 'getSnapshots',
  SCAN_HISTORY_DATA: 'SCAN_HISTORY_DATA',
  ERROR: 'ERROR'
});
