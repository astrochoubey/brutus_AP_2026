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
