/**
 * Brutus – Instagram Network Observatory
 * Feature: Background Storage & Relationship Engine
 * Owner:   Prachi (@astrochoubey)
 *
 * Implements persistent snapshot storage with chrome.storage.local,
 * maximum 10-snapshot history management, data validation, and
 * set-based relationship calculations (mutuals, don't follow back,
 * not followed back).
 */

export const MAX_SNAPSHOTS = 10;

export const STORAGE_KEYS = Object.freeze({
  SNAPSHOTS: 'brutus_snapshots',
  LATEST: 'brutus_latest_snapshot',
  PENDING: 'brutus_pending_scan',
});

/**
 * In-memory fallback storage for environments without chrome.storage.local (e.g. unit tests).
 */
class MemoryStorage {
  constructor() {
    this._data = new Map();
  }

  async get(keys) {
    const result = {};
    if (keys === null || keys === undefined) {
      for (const [k, v] of this._data.entries()) {
        result[k] = structuredClone(v);
      }
      return result;
    }
    const keyList = Array.isArray(keys) ? keys : (typeof keys === 'string' ? [keys] : Object.keys(keys));
    for (const k of keyList) {
      if (this._data.has(k)) {
        result[k] = structuredClone(this._data.get(k));
      } else if (typeof keys === 'object' && !Array.isArray(keys) && k in keys) {
        result[k] = structuredClone(keys[k]);
      }
    }
    return result;
  }

  async set(items) {
    for (const [k, v] of Object.entries(items)) {
      this._data.set(k, structuredClone(v));
    }
  }

  async remove(keys) {
    const keyList = Array.isArray(keys) ? keys : [keys];
    for (const k of keyList) {
      this._data.delete(k);
    }
  }

  async clear() {
    this._data.clear();
  }
}

export const fallbackStorage = new MemoryStorage();

/**
 * Resolves the active storage provider (chrome.storage.local or fallback).
 *
 * @param {Object} [customStorage] - Optional storage area override (for testing/dependency injection)
 * @returns {Object} Promisified storage interface with get, set, remove
 */
export function getStorageArea(customStorage) {
  if (customStorage && typeof customStorage.get === 'function' && typeof customStorage.set === 'function') {
    return customStorage;
  }

  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
    return {
      get: (keys) => new Promise((resolve, reject) => {
        try {
          chrome.storage.local.get(keys, (res) => {
            if (chrome.runtime && chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message));
            } else {
              resolve(res || {});
            }
          });
        } catch (err) {
          reject(err);
        }
      }),
      set: (items) => new Promise((resolve, reject) => {
        try {
          chrome.storage.local.set(items, () => {
            if (chrome.runtime && chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message));
            } else {
              resolve();
            }
          });
        } catch (err) {
          reject(err);
        }
      }),
      remove: (keys) => new Promise((resolve, reject) => {
        try {
          chrome.storage.local.remove(keys, () => {
            if (chrome.runtime && chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message));
            } else {
              resolve();
            }
          });
        } catch (err) {
          reject(err);
        }
      }),
    };
  }

  return fallbackStorage;
}

/**
 * Normalizes an individual username string.
 *
 * @param {*} raw - Raw username value or user object
 * @returns {string|null} Clean username or null if invalid
 */
export function normalizeUsername(raw) {
  if (raw == null) return null;

  let val = raw;
  if (typeof raw === 'object') {
    val = raw.username || raw.user || raw.id;
  }
  if (val == null) return null;

  let u = String(val).trim();
  while (u.startsWith('@')) u = u.slice(1);
  u = u.toLowerCase();

  if (u.length === 0 || u.length > 30) return null;
  if (!/^[a-z0-9._]+$/.test(u)) return null;
  if (u.startsWith('.') || u.endsWith('.')) return null;
  if (u.includes('..')) return null;

  return u;
}

/**
 * Validates and normalizes an array of usernames.
 * Handles strings, user objects, strips duplicates, and sorts alphabetically.
 *
 * @param {*} list - Input array
 * @param {string} [fieldName='users'] - Context name for error messages
 * @returns {{ valid: boolean, users: string[], count: number, error?: string }}
 */
export function validateUserList(list, fieldName = 'users') {
  if (!Array.isArray(list)) {
    return {
      valid: false,
      users: [],
      count: 0,
      error: `Invalid ${fieldName} payload: expected an array, received ${typeof list}`,
    };
  }

  const seen = new Set();
  for (const item of list) {
    const username = normalizeUsername(item);
    if (username) {
      seen.add(username);
    }
  }

  const users = Array.from(seen).sort();
  return {
    valid: true,
    users,
    count: users.length,
  };
}

/**
 * Calculates relationship sets from followers and following lists:
 * - Mutuals: Users you follow who follow you back (followers ∩ following)
 * - Don't Follow Back: Users you follow who do NOT follow you back (following − followers)
 * - Not Followed Back: Users who follow you whom you do NOT follow back (followers − following)
 *
 * @param {Array<string|Object>} followersInput
 * @param {Array<string|Object>} followingInput
 * @returns {{
 *   mutuals: string[],
 *   dontFollowBack: string[],
 *   notFollowedBack: string[],
 *   stats: {
 *     followersCount: number,
 *     followingCount: number,
 *     mutualsCount: number,
 *     dontFollowBackCount: number,
 *     notFollowedBackCount: number,
 *     reciprocityRate: number
 *   }
 * }}
 */
export function calculateRelationships(followersInput = [], followingInput = []) {
  const followersValidation = validateUserList(followersInput, 'followers');
  const followingValidation = validateUserList(followingInput, 'following');

  const followersSet = new Set(followersValidation.users);
  const followingSet = new Set(followingValidation.users);

  const mutuals = [];
  const dontFollowBack = [];
  const notFollowedBack = [];

  // Iterate over following to classify mutuals and users who don't follow back
  for (const username of followingSet) {
    if (followersSet.has(username)) {
      mutuals.push(username);
    } else {
      dontFollowBack.push(username);
    }
  }

  // Iterate over followers to find users not followed back (fans)
  for (const username of followersSet) {
    if (!followingSet.has(username)) {
      notFollowedBack.push(username);
    }
  }

  mutuals.sort();
  dontFollowBack.sort();
  notFollowedBack.sort();

  const followingCount = followingSet.size;
  const followersCount = followersSet.size;
  const mutualsCount = mutuals.length;
  const reciprocityRate = followingCount > 0
    ? parseFloat((mutualsCount / followingCount).toFixed(4))
    : 0.0;

  return {
    mutuals,
    dontFollowBack,
    notFollowedBack,
    stats: {
      followersCount,
      followingCount,
      mutualsCount,
      dontFollowBackCount: dontFollowBack.length,
      notFollowedBackCount: notFollowedBack.length,
      reciprocityRate,
    },
  };
}

/**
 * Creates a structured, timestamped snapshot record.
 *
 * @param {Object} params
 * @param {Array} [params.followers=[]]
 * @param {Array} [params.following=[]]
 * @param {Object} [params.metadata={}]
 * @returns {Object} Complete snapshot object
 */
export function createSnapshot({ followers = [], following = [], metadata = {} } = {}) {
  const followersRes = validateUserList(followers, 'followers');
  const followingRes = validateUserList(following, 'following');

  const relationships = calculateRelationships(followersRes.users, followingRes.users);
  const now = new Date();

  return {
    id: `snapshot_${now.getTime()}_${Math.random().toString(36).substring(2, 7)}`,
    timestamp: now.toISOString(),
    followers: followersRes.users,
    following: followingRes.users,
    mutuals: relationships.mutuals,
    dontFollowBack: relationships.dontFollowBack,
    notFollowedBack: relationships.notFollowedBack,
    stats: relationships.stats,
    metadata: {
      source: 'brutus-background',
      ...metadata,
    },
  };
}

/**
 * Saves a snapshot to chrome.storage.local while strictly maintaining
 * at most MAX_SNAPSHOTS (10) historical records using FIFO eviction.
 *
 * @param {Object} snapshot - Validated snapshot object
 * @param {Object} [customStorage] - Optional storage area override
 * @returns {Promise<{ success: boolean, snapshot: Object, totalSnapshots: number, error?: string }>}
 */
export async function saveSnapshot(snapshot, customStorage) {
  if (!snapshot || typeof snapshot !== 'object') {
    throw new Error('Cannot save invalid snapshot: snapshot must be a non-null object');
  }

  const storage = getStorageArea(customStorage);
  const current = await storage.get(STORAGE_KEYS.SNAPSHOTS);
  let history = Array.isArray(current[STORAGE_KEYS.SNAPSHOTS])
    ? current[STORAGE_KEYS.SNAPSHOTS]
    : [];

  // Append new snapshot
  history.push(snapshot);

  // Maintain up to MAX_SNAPSHOTS (10) historical snapshots (FIFO)
  if (history.length > MAX_SNAPSHOTS) {
    history = history.slice(-MAX_SNAPSHOTS);
  }

  await storage.set({
    [STORAGE_KEYS.SNAPSHOTS]: history,
    [STORAGE_KEYS.LATEST]: snapshot,
  });

  return {
    success: true,
    snapshot,
    totalSnapshots: history.length,
  };
}

/**
 * Retrieves the latest snapshot from storage.
 *
 * @param {Object} [customStorage] - Optional storage area override
 * @returns {Promise<Object|null>} Latest snapshot record or null if none exist
 */
export async function getLatestSnapshot(customStorage) {
  const storage = getStorageArea(customStorage);
  const data = await storage.get([STORAGE_KEYS.LATEST, STORAGE_KEYS.SNAPSHOTS]);

  if (data[STORAGE_KEYS.LATEST]) {
    return data[STORAGE_KEYS.LATEST];
  }

  const list = data[STORAGE_KEYS.SNAPSHOTS];
  if (Array.isArray(list) && list.length > 0) {
    return list[list.length - 1];
  }

  return null;
}

/**
 * Retrieves all stored historical snapshots (up to 10).
 *
 * @param {Object} [customStorage] - Optional storage area override
 * @returns {Promise<Array<Object>>} List of historical snapshots
 */
export async function getSnapshotHistory(customStorage) {
  const storage = getStorageArea(customStorage);
  const data = await storage.get(STORAGE_KEYS.SNAPSHOTS);
  const list = data[STORAGE_KEYS.SNAPSHOTS];
  return Array.isArray(list) ? list : [];
}

/**
 * Clears all snapshot records from storage.
 *
 * @param {Object} [customStorage] - Optional storage area override
 * @returns {Promise<{ success: boolean }>}
 */
export async function clearSnapshots(customStorage) {
  const storage = getStorageArea(customStorage);
  await storage.remove([STORAGE_KEYS.SNAPSHOTS, STORAGE_KEYS.LATEST, STORAGE_KEYS.PENDING]);
  return { success: true };
}

/**
 * Persists intermediate / pending scan data (e.g. followers collected while waiting for following).
 *
 * @param {'followers'|'following'} type
 * @param {Array} list
 * @param {Object} [customStorage]
 * @returns {Promise<Object>}
 */
export async function savePendingScanData(type, list, customStorage) {
  if (type !== 'followers' && type !== 'following') {
    throw new Error(`Invalid pending scan type: expected "followers" or "following", received "${type}"`);
  }

  const storage = getStorageArea(customStorage);
  const current = await storage.get(STORAGE_KEYS.PENDING);
  const pending = (current && typeof current[STORAGE_KEYS.PENDING] === 'object' && current[STORAGE_KEYS.PENDING] !== null)
    ? current[STORAGE_KEYS.PENDING]
    : {};

  const validation = validateUserList(list, type);
  pending[type] = validation.users;
  pending[`${type}Timestamp`] = new Date().toISOString();

  await storage.set({ [STORAGE_KEYS.PENDING]: pending });
  return pending;
}

/**
 * Retrieves pending scan data.
 *
 * @param {Object} [customStorage]
 * @returns {Promise<Object>}
 */
export async function getPendingScanData(customStorage) {
  const storage = getStorageArea(customStorage);
  const current = await storage.get(STORAGE_KEYS.PENDING);
  return (current && typeof current[STORAGE_KEYS.PENDING] === 'object' && current[STORAGE_KEYS.PENDING] !== null)
    ? current[STORAGE_KEYS.PENDING]
    : {};
}

/**
 * Clears pending scan data.
 *
 * @param {Object} [customStorage]
 * @returns {Promise<void>}
 */
export async function clearPendingScanData(customStorage) {
  const storage = getStorageArea(customStorage);
  await storage.remove(STORAGE_KEYS.PENDING);
}
