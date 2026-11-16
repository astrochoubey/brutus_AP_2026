import { describe, it, expect } from 'vitest';
import { compareRelationships } from '../../extension/src/utils/comparison.js';

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
