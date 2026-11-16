import { describe, it, expect } from 'vitest';
import { buildNetworkGraph } from '../../extension/src/utils/graph.js';

describe('Network Graph Visualization Utilities', () => {
    it('constructs graph nodes and directed edges properly', () => {
        const mutuals = [{ id: '1', username: 'alice' }];
        const followingOnly = [{ id: '2', username: 'bob' }];
        const dontFollowBack = [{ id: '3', username: 'charlie' }];

        const graph = buildNetworkGraph('observer_user', mutuals, followingOnly, dontFollowBack);

        expect(graph.nodes).toHaveLength(4);
        expect(graph.edges).toHaveLength(3);

        const observerNode = graph.nodes.find(n => n.id === 'observer');
        expect(observerNode).toBeDefined();
        expect(observerNode.label).toBe('observer_user');

        const mutualEdge = graph.edges.find(e => e.type === 'mutual');
        expect(mutualEdge.direction).toBe('bidirectional');

        const outgoingEdge = graph.edges.find(e => e.type === 'following_only');
        expect(outgoingEdge.direction).toBe('outgoing');

        const incomingEdge = graph.edges.find(e => e.type === 'follower_only');
        expect(incomingEdge.direction).toBe('incoming');
    });
});
