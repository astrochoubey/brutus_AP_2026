import { describe, it, expect, beforeEach } from 'vitest';
import {
  handleMessage,
  handleFollowersData,
  handleFollowingData,
  handleCreateSnapshot,
  handleGetLatestSnapshot,
  handleGetSnapshots,
  handleClearSnapshots,
  handleGetPendingData,
  handleCalculateRelationships,
} from '../../extension/src/background/serviceWorker.js';
import {
  calculateRelationships,
  createSnapshot,
  saveSnapshot,
  getLatestSnapshot,
  getSnapshotHistory,
  clearSnapshots,
  validateUserList,
  normalizeUsername,
  MAX_SNAPSHOTS,
  STORAGE_KEYS,
} from '../../extension/src/utils/storage.js';

// Helper to create an isolated mock storage instance for each test
function createMockStorage() {
  const store = new Map();
  return {
    async get(keys) {
      const res = {};
      if (keys === null || keys === undefined) {
        for (const [k, v] of store.entries()) {
          res[k] = JSON.parse(JSON.stringify(v));
        }
        return res;
      }
      const list = Array.isArray(keys) ? keys : (typeof keys === 'string' ? [keys] : Object.keys(keys));
      for (const k of list) {
        if (store.has(k)) {
          res[k] = JSON.parse(JSON.stringify(store.get(k)));
        } else if (typeof keys === 'object' && !Array.isArray(keys) && k in keys) {
          res[k] = JSON.parse(JSON.stringify(keys[k]));
        }
      }
      return res;
    },
    async set(items) {
      for (const [k, v] of Object.entries(items)) {
        store.set(k, JSON.parse(JSON.stringify(v)));
      }
    },
    async remove(keys) {
      const list = Array.isArray(keys) ? keys : [keys];
      for (const k of list) {
        store.delete(k);
      }
    },
    async clear() {
      store.clear();
    },
  };
}

describe('Background Service Worker & Storage Module', () => {
  let mockStorage;

  beforeEach(() => {
    mockStorage = createMockStorage();
  });

  // ═════════════════════════════════════════════════════════════════════
  // 1. Data Normalization & Validation
  // ═════════════════════════════════════════════════════════════════════
  describe('Username Normalization & List Validation', () => {
    it('normalizes usernames properly', () => {
      expect(normalizeUsername('  @Alice_Dev  ')).toBe('alice_dev');
      expect(normalizeUsername('Bob.Smith')).toBe('bob.smith');
      expect(normalizeUsername({ username: 'Charlie' })).toBe('charlie');
      expect(normalizeUsername(null)).toBeNull();
      expect(normalizeUsername('')).toBeNull();
      expect(normalizeUsername('.invalid.')).toBeNull();
      expect(normalizeUsername('invalid..dots')).toBeNull();
    });

    it('validates and deduplicates a list of usernames', () => {
      const input = ['@Alice', 'alice', '  BOB  ', 'charlie', 'invalid..user', null];
      const result = validateUserList(input, 'testList');

      expect(result.valid).toBe(true);
      expect(result.count).toBe(3);
      expect(result.users).toEqual(['alice', 'bob', 'charlie']);
    });

    it('rejects non-array payloads with descriptive error', () => {
      const result = validateUserList('not-an-array', 'followers');
      expect(result.valid).toBe(false);
      expect(result.count).toBe(0);
      expect(result.error).toContain('Invalid followers payload: expected an array');
    });
  });

  // ═════════════════════════════════════════════════════════════════════
  // 2. Relationship Calculations
  // ═════════════════════════════════════════════════════════════════════
  describe('Relationship Calculations (Mutuals, Fans, Unreciprocated)', () => {
    it('correctly calculates mutuals, dontFollowBack, and notFollowedBack', () => {
      // You follow: alice, bob, charlie
      // Follows you: alice, charlie, david, eve
      const followers = ['alice', 'charlie', 'david', 'eve'];
      const following = ['alice', 'bob', 'charlie'];

      const result = calculateRelationships(followers, following);

      // Mutuals: alice, charlie
      expect(result.mutuals).toEqual(['alice', 'charlie']);
      // Don't follow back: you follow bob, but bob doesn't follow you
      expect(result.dontFollowBack).toEqual(['bob']);
      // Not followed back (fans): david & eve follow you, but you don't follow them
      expect(result.notFollowedBack).toEqual(['david', 'eve']);

      // Stats
      expect(result.stats).toEqual({
        followersCount: 4,
        followingCount: 3,
        mutualsCount: 2,
        dontFollowBackCount: 1,
        notFollowedBackCount: 2,
        reciprocityRate: 0.6667, // 2 / 3
      });
    });

    it('handles disjoint lists cleanly', () => {
      const followers = ['user_a', 'user_b'];
      const following = ['user_c', 'user_d'];

      const result = calculateRelationships(followers, following);
      expect(result.mutuals).toEqual([]);
      expect(result.dontFollowBack).toEqual(['user_c', 'user_d']);
      expect(result.notFollowedBack).toEqual(['user_a', 'user_b']);
      expect(result.stats.reciprocityRate).toBe(0);
    });

    it('handles empty lists gracefully', () => {
      const result = calculateRelationships([], []);
      expect(result.mutuals).toEqual([]);
      expect(result.dontFollowBack).toEqual([]);
      expect(result.notFollowedBack).toEqual([]);
      expect(result.stats.reciprocityRate).toBe(0);
    });
  });

  // ═════════════════════════════════════════════════════════════════════
  // 3. Snapshot Creation & Persistent Storage
  // ═════════════════════════════════════════════════════════════════════
  describe('Snapshot Creation & Storage', () => {
    it('creates a valid timestamped snapshot structure', () => {
      const snapshot = createSnapshot({
        followers: ['alice', 'bob'],
        following: ['bob', 'charlie'],
        metadata: { scanId: 'test_123' },
      });

      expect(snapshot.id).toMatch(/^snapshot_\d+_[a-z0-9]+$/);
      expect(new Date(snapshot.timestamp).getTime()).toBeGreaterThan(0);
      expect(snapshot.followers).toEqual(['alice', 'bob']);
      expect(snapshot.following).toEqual(['bob', 'charlie']);
      expect(snapshot.mutuals).toEqual(['bob']);
      expect(snapshot.dontFollowBack).toEqual(['charlie']);
      expect(snapshot.notFollowedBack).toEqual(['alice']);
      expect(snapshot.metadata.scanId).toBe('test_123');
    });

    it('saves snapshot and retrieves the latest snapshot', async () => {
      const snapshot = createSnapshot({
        followers: ['alice'],
        following: ['alice'],
      });

      await saveSnapshot(snapshot, mockStorage);

      const latest = await getLatestSnapshot(mockStorage);
      expect(latest).not.toBeNull();
      expect(latest.id).toBe(snapshot.id);
      expect(latest.mutuals).toEqual(['alice']);
    });

    it('returns null when no snapshots exist', async () => {
      const latest = await getLatestSnapshot(mockStorage);
      expect(latest).toBeNull();

      const history = await getSnapshotHistory(mockStorage);
      expect(history).toEqual([]);
    });
  });

  // ═════════════════════════════════════════════════════════════════════
  // 4. Maximum History Limit (Strictly 10 Snapshots FIFO)
  // ═════════════════════════════════════════════════════════════════════
  describe('Snapshot Pruning (10 Max History Limit)', () => {
    it('maintains at most 10 historical snapshots using FIFO eviction', async () => {
      // Insert 14 snapshots sequentially
      for (let i = 1; i <= 14; i++) {
        const snap = createSnapshot({
          followers: [`user_${i}`],
          following: [`user_${i}`],
          metadata: { index: i },
        });
        await saveSnapshot(snap, mockStorage);
      }

      const history = await getSnapshotHistory(mockStorage);
      expect(history).toHaveLength(MAX_SNAPSHOTS);
      expect(history).toHaveLength(10);

      // The oldest 4 snapshots (indices 1..4) should have been evicted
      const indices = history.map((s) => s.metadata.index);
      expect(indices).toEqual([5, 6, 7, 8, 9, 10, 11, 12, 13, 14]);

      // Latest snapshot should be index 14
      const latest = await getLatestSnapshot(mockStorage);
      expect(latest.metadata.index).toBe(14);
    });

    it('clears all snapshots and pending data', async () => {
      const snap = createSnapshot({ followers: ['alice'], following: ['alice'] });
      await saveSnapshot(snap, mockStorage);

      await clearSnapshots(mockStorage);

      const history = await getSnapshotHistory(mockStorage);
      expect(history).toEqual([]);
      const latest = await getLatestSnapshot(mockStorage);
      expect(latest).toBeNull();
    });
  });

  // ═════════════════════════════════════════════════════════════════════
  // 5. Message Reception & Dispatching (handleMessage)
  // ═════════════════════════════════════════════════════════════════════
  describe('Chrome Runtime Message Handler', () => {
    it('handles followersData and buffers when following is pending', async () => {
      let responsePayload;
      const response = await handleMessage(
        {
          type: 'followersData',
          followers: ['@alice', 'bob'],
          timestamp: '2026-11-23T20:00:00.000Z',
          source: 'content/followers.js',
        },
        null,
        (res) => { responsePayload = res; },
        mockStorage
      );

      expect(response.success).toBe(true);
      expect(response.snapshotCreated).toBe(false);
      expect(response.pendingFollowing).toBe(true);
      expect(response.count).toBe(2);
      expect(responsePayload).toEqual(response);

      // Verify pending data in storage
      const pendingRes = await handleMessage({ type: 'getPendingData' }, null, null, mockStorage);
      expect(pendingRes.pending.followers).toEqual(['alice', 'bob']);
    });

    it('automatically creates snapshot when followingData completes pending followersData', async () => {
      // Step 1: followersData arrives from Kushagra's content script
      await handleMessage(
        {
          type: 'followersData',
          followers: ['alice', 'charlie'],
          timestamp: '2026-11-23T20:00:00.000Z',
          source: 'content/followers.js',
        },
        null,
        null,
        mockStorage
      );

      // Step 2: followingData arrives from following collector
      const finalRes = await handleMessage(
        {
          type: 'followingData',
          following: ['alice', 'bob'],
          timestamp: '2026-11-23T20:01:00.000Z',
          source: 'content/following.js',
        },
        null,
        null,
        mockStorage
      );

      expect(finalRes.success).toBe(true);
      expect(finalRes.snapshotCreated).toBe(true);
      expect(finalRes.snapshot).toBeDefined();
      expect(finalRes.snapshot.mutuals).toEqual(['alice']);
      expect(finalRes.snapshot.dontFollowBack).toEqual(['bob']);
      expect(finalRes.snapshot.notFollowedBack).toEqual(['charlie']);

      // Snapshot should now be in persistent storage
      const latestRes = await handleMessage({ type: 'getLatestSnapshot' }, null, null, mockStorage);
      expect(latestRes.snapshot.id).toBe(finalRes.snapshot.id);
    });

    it('creates snapshot directly via createSnapshot message', async () => {
      const response = await handleMessage(
        {
          type: 'createSnapshot',
          followers: ['user1', 'user2'],
          following: ['user2', 'user3'],
          metadata: { note: 'manual test snapshot' },
        },
        null,
        null,
        mockStorage
      );

      expect(response.success).toBe(true);
      expect(response.snapshot.mutuals).toEqual(['user2']);
      expect(response.snapshot.dontFollowBack).toEqual(['user3']);
      expect(response.snapshot.notFollowedBack).toEqual(['user1']);
      expect(response.totalSnapshots).toBe(1);
    });

    it('retrieves snapshot history via getSnapshots message', async () => {
      await handleMessage(
        { type: 'createSnapshot', followers: ['a'], following: ['a'] },
        null,
        null,
        mockStorage
      );
      await handleMessage(
        { type: 'createSnapshot', followers: ['b'], following: ['b'] },
        null,
        null,
        mockStorage
      );

      const response = await handleMessage({ type: 'getSnapshots' }, null, null, mockStorage);
      expect(response.success).toBe(true);
      expect(response.count).toBe(2);
      expect(response.snapshots).toHaveLength(2);
      expect(response.maxLimit).toBe(10);
    });

    it('computes ad-hoc relationships via calculateRelationships message without storing', async () => {
      const response = await handleMessage(
        {
          type: 'calculateRelationships',
          followers: ['u1', 'u2'],
          following: ['u2', 'u3'],
        },
        null,
        null,
        mockStorage
      );

      expect(response.success).toBe(true);
      expect(response.mutuals).toEqual(['u2']);
      expect(response.dontFollowBack).toEqual(['u3']);
      expect(response.notFollowedBack).toEqual(['u1']);

      // Should not have stored a snapshot
      const latest = await getLatestSnapshot(mockStorage);
      expect(latest).toBeNull();
    });

    it('clears snapshots via clearSnapshots message', async () => {
      await handleMessage(
        { type: 'createSnapshot', followers: ['a'], following: ['a'] },
        null,
        null,
        mockStorage
      );
      const clearRes = await handleMessage({ type: 'clearSnapshots' }, null, null, mockStorage);
      expect(clearRes.success).toBe(true);

      const latestRes = await handleMessage({ type: 'getLatestSnapshot' }, null, null, mockStorage);
      expect(latestRes.snapshot).toBeNull();
    });
  });

  // ═════════════════════════════════════════════════════════════════════
  // 6. Error Handling
  // ═════════════════════════════════════════════════════════════════════
  describe('Error Handling & Resilience', () => {
    it('returns error for invalid message payload (null or primitive)', async () => {
      const res1 = await handleMessage(null);
      expect(res1.success).toBe(false);
      expect(res1.error).toContain('expected a non-null object');

      const res2 = await handleMessage('invalid');
      expect(res2.success).toBe(false);
      expect(res2.error).toContain('expected a non-null object');
    });

    it('returns error for unknown message type', async () => {
      const res = await handleMessage({ type: 'unknown_action_type' });
      expect(res.success).toBe(false);
      expect(res.error).toContain('Unknown or unsupported message type');
    });

    it('returns error when followersData payload has invalid followers array', async () => {
      const res = await handleMessage(
        { type: 'followersData', followers: 'not_an_array' },
        null,
        null,
        mockStorage
      );
      expect(res.success).toBe(false);
      expect(res.error).toContain('Invalid followers payload');
    });

    it('returns error when followingData payload has invalid following array', async () => {
      const res = await handleMessage(
        { type: 'followingData', following: 12345 },
        null,
        null,
        mockStorage
      );
      expect(res.success).toBe(false);
      expect(res.error).toContain('Invalid following payload');
    });

    it('catches and reports storage failures cleanly without throwing uncaught exceptions', async () => {
      const failingStorage = {
        async get() {
          throw new Error('Simulated chrome.storage.local failure');
        },
        async set() {
          throw new Error('Simulated chrome.storage.local failure');
        },
      };

      const res = await handleMessage(
        { type: 'getLatestSnapshot' },
        null,
        null,
        failingStorage
      );
      expect(res.success).toBe(false);
      expect(res.error).toBe('Simulated chrome.storage.local failure');
    });
  });
});
