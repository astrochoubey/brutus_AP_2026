// constants.js
// Centralized configuration values, threshold constants, and storage key names.

// Chrome storage keys used by the extension.
export const STORAGE_KEYS = {
  CURRENT_SNAPSHOT: 'brutus_current_snapshot',
  SCAN_HISTORY: 'brutus_scan_history',
  SETTINGS: 'brutus_settings'
};

// Confidence score below which a scan is considered PARTIAL.
export const PARTIAL_SCAN_THRESHOLD = 0.95;

// Maximum number of users shown in the popup user list.
export const POPUP_USER_LIST_LIMIT = 50;

// Filter category values used by FilterBar.
export const FILTER = {
  ALL: 'all',
  MUTUALS: 'mutuals',
  NOT_FOLLOWING_BACK: 'notFollowingBack',
  DONT_FOLLOW_BACK: 'dontFollowBack'
};

// Scan status codes matching ScanMetadata.status.
export const SCAN_STATUS = {
  IDLE: 'IDLE',
  SCANNING: 'SCANNING',
  COMPLETE: 'COMPLETE',
  PARTIAL: 'PARTIAL',
  FAILED: 'FAILED'
};
