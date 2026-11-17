/**
 * Graph construction utilities for rendering network visualization layouts.
 */

/**
 * Builds nodes and edges from a classified relationship snapshot.
 *
 * @param {string} observerUsername - The root account handle
 * @param {Array<Object>} mutuals - Mutual connections
 * @param {Array<Object>} followingOnly - Non-followers you follow
 * @param {Array<Object>} dontFollowBack - Fans / followers you do not follow back
 * @returns {{ nodes: Array<Object>, edges: Array<Object> }} Graph representation
 */
export function buildNetworkGraph(observerUsername, mutuals = [], followingOnly = [], dontFollowBack = []) {
    const nodes = [
        {
            id: 'observer',
            label: observerUsername || 'You',
            type: 'observer',
            size: 25
        }
    ];

    const edges = [];
    let edgeId = 0;

    for (const user of mutuals) {
        const nodeId = `user_${user.id || user.username}`;
        nodes.push({
            id: nodeId,
            label: user.username,
            type: 'mutual',
            size: 15
        });
        edges.push({
            id: `edge_${++edgeId}`,
            source: 'observer',
            target: nodeId,
            direction: 'bidirectional',
            type: 'mutual'
        });
    }

    for (const user of followingOnly) {
        const nodeId = `user_${user.id || user.username}`;
        nodes.push({
            id: nodeId,
            label: user.username,
            type: 'following_only',
            size: 10
        });
        edges.push({
            id: `edge_${++edgeId}`,
            source: 'observer',
            target: nodeId,
            direction: 'outgoing',
            type: 'following_only'
        });
    }

    for (const user of dontFollowBack) {
        const nodeId = `user_${user.id || user.username}`;
        nodes.push({
            id: nodeId,
            label: user.username,
            type: 'follower_only',
            size: 10
        });
        edges.push({
            id: `edge_${++edgeId}`,
            source: nodeId,
            target: 'observer',
            direction: 'incoming',
            type: 'follower_only'
        });
    }

    return { nodes, edges };
}
