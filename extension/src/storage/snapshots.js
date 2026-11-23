/**
 * Brutus – Instagram Network Observatory
 * Snapshot storage interface.
 * Re-exports snapshot operations from utils/storage.js.
 */

export {
  MAX_SNAPSHOTS,
  STORAGE_KEYS,
  createSnapshot,
  saveSnapshot,
  getLatestSnapshot,
  getSnapshotHistory,
  clearSnapshots,
  calculateRelationships,
  validateUserList,
  normalizeUsername,
  getStorageArea,
  savePendingScanData,
  getPendingScanData,
  clearPendingScanData,
} from '../utils/storage.js';
