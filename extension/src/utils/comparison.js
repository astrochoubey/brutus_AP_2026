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
    const toUser = (u) => (typeof u === 'string' ? { id: u, username: u } : u);
    const getKey = (u) => (typeof u === 'string' ? u : (u?.id || u?.username || ''));

    const followers = Array.isArray(followersList) ? followersList : [];
    const following = Array.isArray(followingList) ? followingList : [];

    const followersMap = new Map(followers.map(u => [getKey(u), toUser(u)]));
    const followingMap = new Map(following.map(u => [getKey(u), toUser(u)]));

    const mutuals = [];
    const notFollowingBack = [];
    const dontFollowBack = [];

    for (const [key, user] of followingMap) {
        if (!key) continue;
        if (followersMap.has(key)) {
            mutuals.push(user);
        } else {
            notFollowingBack.push(user);
        }
    }

    for (const [key, user] of followersMap) {
        if (!key) continue;
        if (!followingMap.has(key)) {
            dontFollowBack.push(user);
        }
    }

    return {
        mutuals,
        notFollowingBack,
        dontFollowBack,
        summary: {
            followersCount: followers.length,
            followingCount: following.length,
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
 * @param {Array<import('../types/models').InstagramUser|string>} prevFollowers
 * @param {Array<import('../types/models').InstagramUser|string>} currFollowers
 * @param {Array<import('../types/models').InstagramUser|string>} prevFollowing
 * @param {Array<import('../types/models').InstagramUser|string>} currFollowing
 */
export function computeSnapshotDiff(prevFollowers = [], currFollowers = [], prevFollowing = [], currFollowing = []) {
    const getKey = (u) => (typeof u === 'string' ? u : (u?.id || u?.username || ''));

    const prevFollowerKeys = new Set((prevFollowers || []).map(getKey).filter(Boolean));
    const currFollowerKeys = new Set((currFollowers || []).map(getKey).filter(Boolean));
    const prevFollowingKeys = new Set((prevFollowing || []).map(getKey).filter(Boolean));
    const currFollowingKeys = new Set((currFollowing || []).map(getKey).filter(Boolean));

    const newFollowers = (currFollowers || []).filter(u => !prevFollowerKeys.has(getKey(u)));
    const lostFollowers = (prevFollowers || []).filter(u => !currFollowerKeys.has(getKey(u)));
    const newFollowing = (currFollowing || []).filter(u => !prevFollowingKeys.has(getKey(u)));
    const unfollowed = (prevFollowing || []).filter(u => !currFollowingKeys.has(getKey(u)));

    return {
        newFollowers,
        lostFollowers,
        newFollowing,
        unfollowed
    };
}

export function generateSnapshotDeltas(diff = {}, detectedAt = new Date().toISOString()) {
  const deltas = [];
  const appendDeltas = (users, deltaType) => {
    for (const u of (users || [])) {
      const id = typeof u === 'string' ? u : (u?.id || u?.username || '');
      const username = typeof u === 'string' ? u : (u?.username || id);
      deltas.push({ targetUserId: id, targetUsername: username, deltaType, detectedAt });
    }
  };
  appendDeltas(diff.newFollowers, 'NEW_FOLLOWER');
  appendDeltas(diff.lostFollowers, 'LOST_FOLLOWER');
  appendDeltas(diff.newFollowing, 'NEW_FOLLOWING');
  appendDeltas(diff.unfollowed, 'UNFOLLOWED');
  return deltas;
}
