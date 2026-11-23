/**
 * Normalises a raw username or user object into a clean canonical handle.
 * Coerces to string, trims whitespace, strips '@', lowercases, and validates handle.
 *
 * @param {string|Object} u
 * @returns {string|null}
 */
export function normalizeUserKey(u) {
  if (u == null) return null;
  let raw = typeof u === 'object' ? (u.username || u.user || u.id) : u;
  if (raw == null) return null;
  let clean = String(raw).trim();
  while (clean.startsWith('@')) clean = clean.slice(1);
  clean = clean.toLowerCase();
  if (clean.length === 0 || clean.length > 30) return null;
  if (!/^[a-z0-9._]+$/.test(clean)) return null;
  return clean;
}

/**
 * Fast ID-based relationship classification comparing followers and following datasets.
 *
 * @param {Array<string|Object>} followers - List of followers (IDs or objects with id)
 * @param {Array<string|Object>} following - List of following (IDs or objects with id)
 * @returns {{ mutual: Array<string>, followingOnly: Array<string>, followerOnly: Array<string> }}
 */
export function compareRelationships(followers = [], following = []) {
  const followerSet = new Set((Array.isArray(followers) ? followers : []).map(normalizeUserKey).filter(Boolean));
  const followingSet = new Set((Array.isArray(following) ? following : []).map(normalizeUserKey).filter(Boolean));
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
 * - Mutual Followers             = Following ∩ Followers (people who follow me and whom I follow back)
 * - Not Following Me Back        = Following − Followers (people I follow who do not follow me back)
 * - Fans / Non-mutual Followers  = Followers − Following (people who follow me but whom I do not follow back)
 * - Reciprocity Percentage       = (Mutual Followers / Total Following) × 100
 *
 * @param {Array<import('../types/models').InstagramUser|string>} followersList
 * @param {Array<import('../types/models').InstagramUser|string>} followingList
 */
export function classifyRelationships(followersList = [], followingList = []) {
    const toUser = (rawItem, clean) => {
        if (typeof rawItem === 'object' && rawItem !== null) {
            return { ...rawItem, id: rawItem.id || clean, username: clean };
        }
        return { id: clean, username: clean };
    };

    const followers = Array.isArray(followersList) ? followersList : [];
    const following = Array.isArray(followingList) ? followingList : [];

    // Map unique normalized usernames to user objects (deduplicating case/whitespace)
    const followersMap = new Map();
    for (const u of followers) {
        const k = normalizeUserKey(u);
        if (k && !followersMap.has(k)) {
            followersMap.set(k, toUser(u, k));
        }
    }

    const followingMap = new Map();
    for (const u of following) {
        const k = normalizeUserKey(u);
        if (k && !followingMap.has(k)) {
            followingMap.set(k, toUser(u, k));
        }
    }

    const mutuals = [];
    const notFollowingBack = []; // Following - Followers (People I follow who do not follow me back)
    const dontFollowBack = [];   // Followers - Following (People who follow me whom I do not follow back / Fans)

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

    // Sort alphabetically by username
    mutuals.sort((a, b) => a.username.localeCompare(b.username));
    notFollowingBack.sort((a, b) => a.username.localeCompare(b.username));
    dontFollowBack.sort((a, b) => a.username.localeCompare(b.username));

    const totalFollowing = followingMap.size;
    const totalFollowers = followersMap.size;
    const totalMutuals = mutuals.length;

    // Reciprocity Percentage: (Mutual Followers / Total Following) * 100
    // Handle empty following list safely to prevent NaN, Infinity, or division by zero
    const reciprocity = totalFollowing > 0
        ? parseFloat(((totalMutuals / totalFollowing) * 100).toFixed(2))
        : 0.0;
    const reciprocityRate = totalFollowing > 0
        ? parseFloat((totalMutuals / totalFollowing).toFixed(4))
        : 0.0;

    // Incomplete flag: when either dataset has not yet been extracted
    const isIncomplete = totalFollowers === 0 || totalFollowing === 0;

    return {
        mutuals,
        notFollowingBack,
        dontFollowBack,
        notFollowingMeBack: notFollowingBack,
        fans: dontFollowBack,
        reciprocity,
        reciprocityRate,
        isIncomplete,
        summary: {
            followersCount: totalFollowers,
            followingCount: totalFollowing,
            totalFollowers,
            totalFollowing,
            totalMutuals,
            mutualsCount: totalMutuals,
            notFollowingBackCount: notFollowingBack.length,
            dontFollowBackCount: dontFollowBack.length,
            reciprocity,
            reciprocityRate,
            isIncomplete
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
    const prevFollowerKeys = new Set((prevFollowers || []).map(normalizeUserKey).filter(Boolean));
    const currFollowerKeys = new Set((currFollowers || []).map(normalizeUserKey).filter(Boolean));
    const prevFollowingKeys = new Set((prevFollowing || []).map(normalizeUserKey).filter(Boolean));
    const currFollowingKeys = new Set((currFollowing || []).map(normalizeUserKey).filter(Boolean));

    const newFollowers = (currFollowers || []).filter(u => !prevFollowerKeys.has(normalizeUserKey(u)));
    const lostFollowers = (prevFollowers || []).filter(u => !currFollowerKeys.has(normalizeUserKey(u)));
    const newFollowing = (currFollowing || []).filter(u => !prevFollowingKeys.has(normalizeUserKey(u)));
    const unfollowed = (prevFollowing || []).filter(u => !currFollowingKeys.has(normalizeUserKey(u)));

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
