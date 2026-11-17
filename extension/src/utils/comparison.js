/**
 * Fast ID-based relationship classification comparing followers and following datasets.
 *
 * @param {Array<string|Object>} followers - List of followers (IDs or objects with id)
 * @param {Array<string|Object>} following - List of following (IDs or objects with id)
 * @returns {{ mutual: Array<string>, followingOnly: Array<string>, followerOnly: Array<string> }}
 */
export function compareRelationships(followers = [], following = []) {
  const toIdSet = (arr) =>
    new Set((Array.isArray(arr) ? arr : []).map((u) => (u && typeof u === 'object' ? u.id : u)).filter(Boolean));
  const followerSet = toIdSet(followers);
  const followingSet = toIdSet(following);
  const mutual = [];
  const followingOnly = [];
  const followerOnly = [];
  for (const id of followingSet) {
    (followerSet.has(id) ? mutual : followingOnly).push(id);
  }
  for (const id of followerSet) {
    if (!followingSet.has(id)) followerOnly.push(id);
  }
  return { mutual, followingOnly, followerOnly };
}

/**
 * Deterministic relationship classification using set operations:
 * - Mutuals            = Following ∩ Followers
 * - Not Following Back = Following − Followers
 * - Don't Follow Back  = Followers − Following
 *
 * @param {Array<import('../types/models').InstagramUser>} followersList
 * @param {Array<import('../types/models').InstagramUser>} followingList
 */
export function classifyRelationships(followersList = [], followingList = []) {
    const followersMap = new Map(followersList.map(u => [u.id || u.username, u]));
    const followingMap = new Map(followingList.map(u => [u.id || u.username, u]));

    const mutuals = [];
    const notFollowingBack = [];
    const dontFollowBack = [];

    for (const [key, user] of followingMap) {
        if (followersMap.has(key)) {
            mutuals.push(user);
        } else {
            notFollowingBack.push(user);
        }
    }

    for (const [key, user] of followersMap) {
        if (!followingMap.has(key)) {
            dontFollowBack.push(user);
        }
    }

    return {
        mutuals,
        notFollowingBack,
        dontFollowBack,
        summary: {
            followersCount: followersList.length,
            followingCount: followingList.length,
            mutualsCount: mutuals.length,
            notFollowingBackCount: notFollowingBack.length,
            dontFollowBackCount: dontFollowBack.length
        }
    };
}

/**
 * Computes the delta / diff between two sequential snapshots:
 * - new_followers   = snapshotB.followers − snapshotA.followers
 * - lost_followers  = snapshotA.followers − snapshotB.followers
 * - new_following   = snapshotB.following − snapshotA.following
 * - unfollowed      = snapshotA.following − snapshotB.following
 *
 * @param {Array<import('../types/models').InstagramUser>} prevFollowers
 * @param {Array<import('../types/models').InstagramUser>} currFollowers
 * @param {Array<import('../types/models').InstagramUser>} prevFollowing
 * @param {Array<import('../types/models').InstagramUser>} currFollowing
 */
export function computeSnapshotDiff(prevFollowers = [], currFollowers = [], prevFollowing = [], currFollowing = []) {
    const prevFollowerKeys = new Set(prevFollowers.map(u => u.id || u.username));
    const currFollowerKeys = new Set(currFollowers.map(u => u.id || u.username));
    const prevFollowingKeys = new Set(prevFollowing.map(u => u.id || u.username));
    const currFollowingKeys = new Set(currFollowing.map(u => u.id || u.username));

    const newFollowers = currFollowers.filter(u => !prevFollowerKeys.has(u.id || u.username));
    const lostFollowers = prevFollowers.filter(u => !currFollowerKeys.has(u.id || u.username));
    const newFollowing = currFollowing.filter(u => !prevFollowingKeys.has(u.id || u.username));
    const unfollowed = prevFollowing.filter(u => !currFollowingKeys.has(u.id || u.username));

    return {
        newFollowers,
        lostFollowers,
        newFollowing,
        unfollowed
    };
}
