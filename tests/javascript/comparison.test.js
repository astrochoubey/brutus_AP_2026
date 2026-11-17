import { describe, it, expect } from 'vitest';
import {
  compareRelationships,
  classifyRelationships,
  computeSnapshotDiff
} from '../../extension/src/utils/comparison.js';

describe('compareRelationships', () => {
  it('classifies mutual, following-only, and follower-only sets', () => {
    expect(compareRelationships(['a', 'b'], ['b', 'c'])).toEqual({
      mutual: ['b'], followingOnly: ['c'], followerOnly: ['a'],
    });
    expect(compareRelationships([{ id: 'a' }, { id: 'a' }], null)).toEqual({
      mutual: [], followingOnly: [], followerOnly: ['a'],
    });
  });
});

describe('Relationship Classification & Snapshot Differencing', () => {
    const alice = { id: '1', username: 'alice' };
    const bob = { id: '2', username: 'bob' };
    const charlie = { id: '3', username: 'charlie' };

    it('correctly partitions followers and following into mutuals and fans', () => {
        const followers = [alice, charlie];
        const following = [alice, bob];

        const { mutuals, notFollowingBack, dontFollowBack } = classifyRelationships(followers, following);

        expect(mutuals).toHaveLength(1);
        expect(mutuals[0].username).toBe('alice');

        expect(notFollowingBack).toHaveLength(1);
        expect(notFollowingBack[0].username).toBe('bob');

        expect(dontFollowBack).toHaveLength(1);
        expect(dontFollowBack[0].username).toBe('charlie');
    });

    it('computes exact diffs across two temporal snapshots', () => {
        const prevFollowers = [alice, bob];
        const currFollowers = [alice, charlie]; // lost bob, gained charlie

        const { newFollowers, lostFollowers } = computeSnapshotDiff(prevFollowers, currFollowers, [], []);

        expect(newFollowers).toHaveLength(1);
        expect(newFollowers[0].username).toBe('charlie');

        expect(lostFollowers).toHaveLength(1);
        expect(lostFollowers[0].username).toBe('bob');
    });
});
