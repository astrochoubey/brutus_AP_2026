/**
 * Normalizes raw user profile objects extracted from Instagram DOM elements.
 * Strips whitespace, standardizes handles, and handles missing or optional attributes.
 *
 * @param {Object} raw - Raw profile payload extracted from DOM
 * @returns {import('../types/models').InstagramUser} Normalized profile object
 */
export function normalizeUser(raw = {}) {
    const id = String(raw.id || raw.pk || raw.userId || '').trim();
    const rawUsername = String(raw.username || raw.user || '').trim();
    const cleanUsername = rawUsername.replace(/^@+/, '').toLowerCase();

    return {
        id,
        username: cleanUsername,
        fullName: String(raw.fullName || raw.full_name || raw.name || '').trim(),
        avatarUrl: String(raw.avatarUrl || raw.profilePicUrl || raw.profile_pic_url || '').trim(),
        isVerified: Boolean(raw.isVerified || raw.is_verified || false),
        isPrivate: Boolean(raw.isPrivate || raw.is_private || false)
    };
}

/**
 * Normalizes a list of extracted DOM user elements.
 * Deduplicates by unique user ID, falling back to username.
 *
 * @param {Array<Object>} rawUsers - Array of extracted profile nodes
 * @returns {Array<import('../types/models').InstagramUser>} Deduplicated list of normalized users
 */
export function normalizeUserList(rawUsers = []) {
    if (!Array.isArray(rawUsers)) return [];

    const seen = new Set();
    const normalized = [];

    for (const raw of rawUsers) {
        const user = normalizeUser(raw);
        const uniqueKey = user.id || user.username;

        if (uniqueKey && !seen.has(uniqueKey)) {
            seen.add(uniqueKey);
            normalized.push(user);
        }
    }

    return normalized;
}
