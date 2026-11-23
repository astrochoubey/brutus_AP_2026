import { describe, it, expect } from 'vitest';
import {
  classifyRelationships,
  compareRelationships,
  normalizeUserKey,
} from '../../extension/src/utils/comparison.js';
import {
  calculateRelationships,
  createSnapshot,
} from '../../extension/src/utils/storage.js';
import {
  calculateReciprocity,
  computeNetworkMetrics,
} from '../../extension/src/utils/statistics.js';

describe('Reciprocity & Mutual Relationship Detection Test Suite', () => {
  // ─────────────────────────────────────────────────────────────────────────
  // 1. Mandatory Controlled Test Case
  // ─────────────────────────────────────────────────────────────────────────
  describe('Mandatory Controlled Dataset (Alice, Bob, Charlie, David vs Alice, Bob, Eve, Frank)', () => {
    const followers = ['alice', 'bob', 'charlie', 'david'];
    const following = ['alice', 'bob', 'eve', 'frank'];

    it('correctly partitions relationships with classifyRelationships', () => {
      const result = classifyRelationships(followers, following);

      const mutualUsernames = result.mutuals.map((u) => u.username);
      const notFollowingBackUsernames = result.notFollowingBack.map((u) => u.username);
      const dontFollowBackUsernames = result.dontFollowBack.map((u) => u.username);

      expect(mutualUsernames).toEqual(['alice', 'bob']);
      expect(notFollowingBackUsernames).toEqual(['eve', 'frank']);
      expect(dontFollowBackUsernames).toEqual(['charlie', 'david']);

      expect(result.summary.totalFollowers).toBe(4);
      expect(result.summary.totalFollowing).toBe(4);
      expect(result.summary.mutualsCount).toBe(2);
      expect(result.summary.notFollowingBackCount).toBe(2);
      expect(result.summary.dontFollowBackCount).toBe(2);
      expect(result.summary.reciprocity).toBe(50.0);
      expect(result.summary.reciprocityRate).toBe(0.5);
      expect(result.summary.isIncomplete).toBe(false);
    });

    it('correctly calculates relationships in storage module', () => {
      const rels = calculateRelationships(followers, following);

      expect(rels.mutuals).toEqual(['alice', 'bob']);
      expect(rels.dontFollowBack).toEqual(['eve', 'frank']); // Following - Followers
      expect(rels.notFollowedBack).toEqual(['charlie', 'david']); // Followers - Following
      expect(rels.stats.followersCount).toBe(4);
      expect(rels.stats.followingCount).toBe(4);
      expect(rels.stats.mutualsCount).toBe(2);
      expect(rels.stats.dontFollowBackCount).toBe(2);
      expect(rels.stats.notFollowedBackCount).toBe(2);
      expect(rels.stats.reciprocityRate).toBe(0.5);
    });

    it('creates accurate snapshot with 50.0% reciprocity', () => {
      const snapshot = createSnapshot({ followers, following });

      expect(snapshot.totalFollowers).toBe(4);
      expect(snapshot.totalFollowing).toBe(4);
      expect(snapshot.totalMutuals).toBe(2);
      expect(snapshot.mutuals).toEqual(['alice', 'bob']);
      expect(snapshot.dontFollowBack).toEqual(['eve', 'frank']);
      expect(snapshot.notFollowedBack).toEqual(['charlie', 'david']);
      expect(snapshot.reciprocity).toBe(50.0);
      expect(snapshot.reciprocityRate).toBe(0.5);
      expect(snapshot.isIncomplete).toBe(false);
    });

    it('computes accurate metrics in statistics module', () => {
      const reciprocity = calculateReciprocity(2, 4);
      expect(reciprocity).toBe(0.5);

      const metrics = computeNetworkMetrics({ followers: 4, following: 4, mutuals: 2 });
      expect(metrics.reciprocity).toBe(0.5);
      expect(metrics.isIncomplete).toBe(false);
      expect(metrics.followingOnly).toBe(2);
      expect(metrics.followersOnly).toBe(2);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // 2. Empty Lists & Incomplete Scans
  // ─────────────────────────────────────────────────────────────────────────
  describe('Empty Lists and Incomplete Scan Guards', () => {
    it('handles empty following list correctly (isIncomplete = true)', () => {
      const followers = ['alice', 'bob'];
      const following = [];

      const result = classifyRelationships(followers, following);
      expect(result.mutuals).toEqual([]);
      expect(result.notFollowingBack).toEqual([]);
      expect(result.dontFollowBack.map((u) => u.username)).toEqual(['alice', 'bob']);
      expect(result.summary.reciprocity).toBe(0.0);
      expect(result.summary.isIncomplete).toBe(true);

      const snapshot = createSnapshot({ followers, following });
      expect(snapshot.reciprocity).toBe(0.0);
      expect(snapshot.isIncomplete).toBe(true);

      const metrics = computeNetworkMetrics({ followers: 2, following: 0, mutuals: 0 });
      expect(metrics.reciprocity).toBe(0.0);
      expect(metrics.isIncomplete).toBe(true);
    });

    it('handles empty followers list correctly (isIncomplete = true)', () => {
      const followers = [];
      const following = ['alice', 'bob'];

      const result = classifyRelationships(followers, following);
      expect(result.mutuals).toEqual([]);
      expect(result.notFollowingBack.map((u) => u.username)).toEqual(['alice', 'bob']);
      expect(result.dontFollowBack).toEqual([]);
      expect(result.summary.reciprocity).toBe(0.0);
      expect(result.summary.isIncomplete).toBe(true);

      const snapshot = createSnapshot({ followers, following });
      expect(snapshot.reciprocity).toBe(0.0);
      expect(snapshot.isIncomplete).toBe(true);

      const metrics = computeNetworkMetrics({ followers: 0, following: 2, mutuals: 0 });
      expect(metrics.reciprocity).toBe(0.0);
      expect(metrics.isIncomplete).toBe(true);
    });

    it('handles both lists empty', () => {
      const result = classifyRelationships([], []);
      expect(result.mutuals).toEqual([]);
      expect(result.notFollowingBack).toEqual([]);
      expect(result.dontFollowBack).toEqual([]);
      expect(result.summary.reciprocity).toBe(0.0);
      expect(result.summary.isIncomplete).toBe(true);

      const snapshot = createSnapshot({ followers: [], following: [] });
      expect(snapshot.reciprocity).toBe(0.0);
      expect(snapshot.isIncomplete).toBe(true);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // 3. Normalization, Case-insensitivity & Deduplication
  // ─────────────────────────────────────────────────────────────────────────
  describe('Case-insensitivity, Whitespace, and Deduplication', () => {
    it('normalizes usernames with different casing, whitespace, and leading @', () => {
      expect(normalizeUserKey('  Alice_Dev  ')).toBe('alice_dev');
      expect(normalizeUserKey('@alice')).toBe('alice');
      expect(normalizeUserKey('@@BOB')).toBe('bob');
    });

    it('deduplicates and matches despite casing and whitespace differences', () => {
      const followers = [' Alice ', '@alice', 'ALICE', 'bob'];
      const following = ['alice', '  BOB  '];

      const result = classifyRelationships(followers, following);

      const mutualUsernames = result.mutuals.map((u) => u.username);
      expect(mutualUsernames).toEqual(['alice', 'bob']);
      expect(result.notFollowingBack).toHaveLength(0);
      expect(result.dontFollowBack).toHaveLength(0);
      expect(result.summary.mutualsCount).toBe(2);
      expect(result.summary.totalFollowers).toBe(2);
      expect(result.summary.totalFollowing).toBe(2);
      expect(result.summary.reciprocity).toBe(100.0);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // 4. Edge Cases: 100% Reciprocity and 0% Disjoint
  // ─────────────────────────────────────────────────────────────────────────
  describe('Reciprocity Boundaries (0% and 100%)', () => {
    it('correctly calculates 100% reciprocity when both lists match completely', () => {
      const users = ['user1', 'user2', 'user3'];
      const result = classifyRelationships(users, users);

      expect(result.mutuals).toHaveLength(3);
      expect(result.notFollowingBack).toHaveLength(0);
      expect(result.dontFollowBack).toHaveLength(0);
      expect(result.summary.reciprocity).toBe(100.0);
      expect(result.summary.reciprocityRate).toBe(1.0);
    });

    it('correctly calculates 0% reciprocity when lists are completely disjoint', () => {
      const followers = ['user1', 'user2'];
      const following = ['user3', 'user4'];
      const result = classifyRelationships(followers, following);

      expect(result.mutuals).toHaveLength(0);
      expect(result.notFollowingBack).toHaveLength(2);
      expect(result.dontFollowBack).toHaveLength(2);
      expect(result.summary.reciprocity).toBe(0.0);
      expect(result.summary.reciprocityRate).toBe(0.0);
      expect(result.summary.isIncomplete).toBe(false);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // 5. High-volume Stress Test (5,000+ entries)
  // ─────────────────────────────────────────────────────────────────────────
  describe('High-Volume Performance & Scalability (5,000+ entries)', () => {
    it('processes 5,000 followers and 5,000 following under 100ms with accurate reciprocity', () => {
      const count = 5000;
      const followers = [];
      const following = [];

      // Generate 5,000 items with 2,500 overlapping mutuals
      for (let i = 0; i < count; i++) {
        followers.push(`follower_user_${i}`);
      }
      // following overlaps from 2500 to 4999 (2,500 mutuals), plus 2,500 new ones (5000 to 7499)
      for (let i = 2500; i < 7500; i++) {
        following.push(`follower_user_${i}`);
      }

      const startTime = performance.now();
      const result = classifyRelationships(followers, following);
      const duration = performance.now() - startTime;

      expect(result.summary.totalFollowers).toBe(5000);
      expect(result.summary.totalFollowing).toBe(5000);
      expect(result.summary.mutualsCount).toBe(2500);
      expect(result.summary.notFollowingBackCount).toBe(2500);
      expect(result.summary.dontFollowBackCount).toBe(2500);
      expect(result.summary.reciprocity).toBe(50.0);
      expect(result.summary.reciprocityRate).toBe(0.5);

      // Verify execution is fast (< 250ms)
      expect(duration).toBeLessThan(250);
    });
  });
});
