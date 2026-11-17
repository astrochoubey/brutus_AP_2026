/**
 * @typedef {Object} InstagramUser
 * @property {string} id - Unique numeric identifier of the Instagram profile
 * @property {string} username - Instagram account handle
 * @property {string} fullName - Profile display name
 * @property {string} avatarUrl - URL of the profile avatar image
 * @property {boolean} isVerified - Whether the profile has a verification badge
 * @property {boolean} isPrivate - Whether the profile is private
 */

/**
 * @typedef {'MUTUAL' | 'FOLLOWING_ONLY' | 'FOLLOWER_ONLY'} RelationshipState
 */

/**
 * @typedef {Object} UserRelationship
 * @property {string} targetUserId - Target profile ID
 * @property {string} targetUsername - Target profile username
 * @property {RelationshipState} state - Computed relationship state relative to observer
 * @property {boolean} followsObserver - True if target follows the observer
 * @property {boolean} followedByObserver - True if observer follows the target
 * @property {string} observedAt - ISO timestamp of observation
 */

/**
 * @typedef {Object} ScanMetadata
 * @property {string} scanId - Unique scan identifier
 * @property {'FOLLOWERS' | 'FOLLOWING' | 'FULL'} scanType - Scope of the scan
 * @property {number} reportedCount - Total count reported by Instagram UI
 * @property {number} collectedCount - Actual count extracted from the DOM
 * @property {number} duplicateCount - Number of duplicate DOM entries filtered
 * @property {number} errorCount - Number of unparseable items encountered
 * @property {number} confidenceScore - Completeness ratio (0.0 to 1.0)
 * @property {'COMPLETE' | 'PARTIAL' | 'FAILED'} status - Quality status
 * @property {string} timestamp - ISO timestamp of the scan
 */

/**
 * @typedef {Object} NetworkSnapshot
 * @property {string} snapshotId - Snapshot unique identifier
 * @property {string} observerId - Observer account ID
 * @property {string} scanId - Associated scan ID
 * @property {number} totalFollowers - Follower count
 * @property {number} totalFollowing - Following count
 * @property {number} totalMutuals - Mutual connection count
 * @property {string} createdAt - Snapshot creation ISO timestamp
 * @property {Map<string, UserRelationship>} relationships - Map of target user ID to relationship
 */

/**
 * @typedef {'NEW_FOLLOWER' | 'LOST_FOLLOWER' | 'NEW_FOLLOWING' | 'UNFOLLOWED' | 'BECAME_MUTUAL' | 'LOST_MUTUAL'} DeltaType
 */

/**
 * @typedef {Object} SnapshotDelta
 * @property {string} targetUserId - ID of the affected profile
 * @property {string} targetUsername - Handle of the affected profile
 * @property {DeltaType} deltaType - Nature of the relationship change
 * @property {string} detectedAt - Timestamp of comparison
 */
