import { describe, it, expect } from 'vitest';
import {
    calculateReciprocity,
    calculateFollowRatio,
    calculateTurnoverRate,
    computeNetworkMetrics
} from '../../extension/src/utils/statistics.js';

describe('Network Statistics Utilities', () => {
    it('calculates reciprocity correctly', () => {
        expect(calculateReciprocity(50, 100)).toBe(0.5);
        expect(calculateReciprocity(0, 100)).toBe(0.0);
        expect(calculateReciprocity(100, 100)).toBe(1.0);
        expect(calculateReciprocity(10, 0)).toBe(0.0);
    });

    it('computes follow-back ratio', () => {
        expect(calculateFollowRatio(250, 200)).toBe(1.25);
        expect(calculateFollowRatio(100, 200)).toBe(0.5);
    });

    it('calculates turnover rate as a percentage', () => {
        expect(calculateTurnoverRate(10, 5, 100)).toBe(15.0);
        expect(calculateTurnoverRate(0, 0, 100)).toBe(0.0);
        expect(calculateTurnoverRate(5, 5, 0)).toBe(0.0);
    });

    it('generates full network metric summaries', () => {
        const metrics = computeNetworkMetrics({ followers: 150, following: 100, mutuals: 60 });
        expect(metrics.totalFollowers).toBe(150);
        expect(metrics.totalFollowing).toBe(100);
        expect(metrics.totalMutuals).toBe(60);
        expect(metrics.followingOnly).toBe(40);
        expect(metrics.followersOnly).toBe(90);
        expect(metrics.reciprocity).toBe(0.6);
        expect(metrics.followRatio).toBe(1.5);
    });
});
