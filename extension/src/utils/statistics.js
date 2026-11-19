/**
 * Statistical calculations for social graph observatory analytics.
 */

/**
 * Calculates network reciprocity: ratio of mutual connections to total following.
 *
 * @param {number} mutualCount - Number of reciprocal connections
 * @param {number} followingCount - Total accounts followed by observer
 * @returns {number} Reciprocity ratio between 0.0 and 1.0
 */
export function calculateReciprocity(mutualCount, followingCount) {
    if (!followingCount || followingCount <= 0) return 0.0;
    const ratio = mutualCount / followingCount;
    return parseFloat(Math.min(1.0, Math.max(0.0, ratio)).toFixed(4));
}

/**
 * Calculates follow-back ratio: total followers divided by total following.
 *
 * @param {number} followersCount - Total followers
 * @param {number} followingCount - Total following
 * @returns {number} Ratio formatted to 2 decimal places
 */
export function calculateFollowRatio(followersCount, followingCount) {
    if (!followingCount || followingCount <= 0) return followersCount > 0 ? followersCount : 0.0;
    return parseFloat((followersCount / followingCount).toFixed(2));
}

/**
 * Calculates network turnover (churn) rate between two snapshots.
 *
 * @param {number} gainedCount - Newly acquired followers
 * @param {number} lostCount - Lost/unfollowed followers
 * @param {number} baselineCount - Total followers at baseline snapshot
 * @returns {number} Churn percentage
 */
export function calculateTurnoverRate(gainedCount, lostCount, baselineCount) {
    if (!baselineCount || baselineCount <= 0) return 0.0;
    const churn = (gainedCount + lostCount) / baselineCount;
    return parseFloat((churn * 100).toFixed(2));
}

/**
 * Computes comprehensive network overview statistics.
 *
 * @param {Object} counts - Counts payload
 * @param {number} counts.followers - Follower count
 * @param {number} counts.following - Following count
 * @param {number} counts.mutuals - Mutuals count
 * @returns {Object} Analytical metrics summary
 */
export function computeNetworkMetrics({ followers = 0, following = 0, mutuals = 0 }) {
    const followingOnly = Math.max(0, following - mutuals);
    const followersOnly = Math.max(0, followers - mutuals);

    return {
        totalFollowers: followers,
        totalFollowing: following,
        totalMutuals: mutuals,
        followingOnly,
        followersOnly,
        reciprocity: calculateReciprocity(mutuals, following),
        followRatio: calculateFollowRatio(followers, following)
    };
}

export function calculateGrowthRate(currentCount, previousCount) {
  if (!previousCount || previousCount <= 0) return 0.0;
  return parseFloat((((currentCount - previousCount) / previousCount) * 100).toFixed(2));
}

export function calculateRetentionRate(retainedCount, baselineCount) {
  if (!baselineCount || baselineCount <= 0) return 0.0;
  const rate = (Math.max(0, retainedCount) / baselineCount) * 100;
  return parseFloat(Math.min(100.0, rate).toFixed(2));
}
