/**
 * Brutus – Instagram Network Observatory
 * Feature: Background Service Worker & Storage
 * Owner:   Prachi (@astrochoubey)
 *
 * Manifest V3 background service worker managing Chrome runtime message
 * dispatching, data validation, set-based relationship calculations,
 * snapshot creation, persistent storage via chrome.storage.local,
 * and 10-snapshot historical pruning.
 */

import {
  MAX_SNAPSHOTS,
  STORAGE_KEYS,
  validateUserList,
  calculateRelationships,
  createSnapshot,
  saveSnapshot,
  getLatestSnapshot,
  getSnapshotHistory,
  clearSnapshots,
  savePendingScanData,
  getPendingScanData,
  clearPendingScanData,
  getStorageArea,
} from '../utils/storage.js';

function broadcastScanComplete(snapshot) {
  if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
    try {
      chrome.runtime.sendMessage({
        action: 'SCAN_COMPLETE',
        type: 'SCAN_COMPLETE',
        status: 'COMPLETE',
        snapshot,
      }, () => {
        if (chrome.runtime.lastError) {}
      });
    } catch (_) {}
  }
}

/**
 * Handles scan requests initiated by the popup by finding the active Instagram tab
 * and dispatching the collection trigger to the injected content script.
 *
 * @param {Object} message - Incoming message payload
 * @returns {Promise<Object>} Response object
 */
export async function handleScanRequest(message) {
  if (typeof chrome === 'undefined' || !chrome.tabs || !chrome.tabs.query) {
    return {
      success: false,
      error: 'Chrome tabs API is not available.',
    };
  }

  const tabs = await new Promise((resolve) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (res) => resolve(res || []));
  });

  const tab = tabs[0];
  if (!tab || !tab.id) {
    return {
      success: false,
      error: 'No active tab found. Please navigate to an Instagram profile.',
    };
  }

  if (!tab.url || !tab.url.includes('instagram.com')) {
    return {
      success: false,
      error: 'Please open your Instagram profile page (instagram.com) before scanning.',
    };
  }

  const scanType = message.scanType || message.type || 'scanFollowers';

  async function sendToTab(attempt = 1) {
    return new Promise((resolve) => {
      chrome.tabs.sendMessage(tab.id, { type: scanType }, async (res) => {
        if (chrome.runtime.lastError) {
          if (attempt === 1 && typeof chrome.scripting !== 'undefined' && chrome.scripting.executeScript) {
            try {
              await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                files: ['src/content/instagram.js'],
              });
              const retryRes = await sendToTab(2);
              return resolve(retryRes);
            } catch (_) {}
          }
          resolve({
            success: false,
            error: 'Please open your Instagram profile and make sure the Followers or Following dialog is open.',
          });
        } else if (!res) {
          resolve({
            success: false,
            error: 'Followers or Following dialog is not open. Please click "followers" or "following" on your Instagram profile first, then click Scan Now.',
          });
        } else {
          resolve(res);
        }
      });
    });
  }

  return await sendToTab(1);
}

/**
 * Handles incoming 'followersData' messages from content scripts or popup.
 *
 * @param {Object} message - Incoming message payload
 * @param {Object} [customStorage] - Optional storage area override
 * @returns {Promise<Object>} Response object
 */
export async function handleFollowersData(message, customStorage) {
  const followersList = message.followers ?? message.data;
  const validation = validateUserList(followersList, 'followers');

  if (!validation.valid) {
    return {
      success: false,
      error: validation.error || 'Invalid followers payload: array of usernames expected',
    };
  }

  const pending = await savePendingScanData('followers', validation.users, customStorage);

  // If following data is already pending or caller requested forced snapshot
  if (message.forceSnapshot || (pending.following && Array.isArray(pending.following))) {
    const latest = await getLatestSnapshot(customStorage);
    const following = (pending.following && Array.isArray(pending.following) && pending.following.length > 0)
      ? pending.following
      : (latest?.following || []);

    const snapshot = createSnapshot({
      followers: validation.users,
      following,
      metadata: {
        source: message.source || 'content/followers.js',
        followersTimestamp: message.timestamp || new Date().toISOString(),
        followingTimestamp: pending.followingTimestamp || latest?.metadata?.followingTimestamp || null,
      },
    });

    await saveSnapshot(snapshot, customStorage);
    broadcastScanComplete(snapshot);

    return {
      success: true,
      snapshotCreated: true,
      snapshot,
      stats: snapshot.stats,
    };
  }

  return {
    success: true,
    snapshotCreated: false,
    pendingFollowing: true,
    count: validation.count,
    message: 'Followers data received and buffered. Awaiting following data for snapshot generation.',
  };
}

/**
 * Handles incoming 'followingData' messages from content scripts or popup.
 *
 * @param {Object} message - Incoming message payload
 * @param {Object} [customStorage] - Optional storage area override
 * @returns {Promise<Object>} Response object
 */
export async function handleFollowingData(message, customStorage) {
  const followingList = message.following ?? message.data;
  const validation = validateUserList(followingList, 'following');

  if (!validation.valid) {
    return {
      success: false,
      error: validation.error || 'Invalid following payload: array of usernames expected',
    };
  }

  const pending = await savePendingScanData('following', validation.users, customStorage);

  // If followers data is already pending or caller requested forced snapshot
  if (message.forceSnapshot || (pending.followers && Array.isArray(pending.followers))) {
    const latest = await getLatestSnapshot(customStorage);
    const followers = (pending.followers && Array.isArray(pending.followers) && pending.followers.length > 0)
      ? pending.followers
      : (latest?.followers || []);

    const snapshot = createSnapshot({
      followers,
      following: validation.users,
      metadata: {
        source: message.source || 'content/following.js',
        followingTimestamp: message.timestamp || new Date().toISOString(),
        followersTimestamp: pending.followersTimestamp || latest?.metadata?.followersTimestamp || null,
      },
    });

    await saveSnapshot(snapshot, customStorage);
    broadcastScanComplete(snapshot);

    return {
      success: true,
      snapshotCreated: true,
      snapshot,
      stats: snapshot.stats,
    };
  }

  return {
    success: true,
    snapshotCreated: false,
    pendingFollowers: true,
    count: validation.count,
    message: 'Following data received and buffered. Awaiting followers data for snapshot generation.',
  };
}

/**
 * Handles explicit snapshot creation requests with both followers and following.
 *
 * @param {Object} message - Incoming message payload
 * @param {Object} [customStorage] - Optional storage area override
 * @returns {Promise<Object>} Response object
 */
export async function handleCreateSnapshot(message, customStorage) {
  const followersList = message.followers ?? [];
  const followingList = message.following ?? [];

  const followersVal = validateUserList(followersList, 'followers');
  if (!followersVal.valid) {
    return { success: false, error: followersVal.error };
  }

  const followingVal = validateUserList(followingList, 'following');
  if (!followingVal.valid) {
    return { success: false, error: followingVal.error };
  }

  const snapshot = createSnapshot({
    followers: followersVal.users,
    following: followingVal.users,
    metadata: message.metadata || { source: 'manual_creation' },
  });

  const saveResult = await saveSnapshot(snapshot, customStorage);

  return {
    success: true,
    snapshot,
    stats: snapshot.stats,
    totalSnapshots: saveResult.totalSnapshots,
  };
}

/**
 * Handles requests to retrieve the most recent snapshot.
 *
 * @param {Object} [customStorage] - Optional storage area override
 * @returns {Promise<Object>} Response object
 */
export async function handleGetLatestSnapshot(customStorage) {
  const snapshot = await getLatestSnapshot(customStorage);
  return {
    success: true,
    snapshot,
  };
}

/**
 * Handles requests to retrieve all stored historical snapshots (up to 10).
 *
 * @param {Object} [customStorage] - Optional storage area override
 * @returns {Promise<Object>} Response object
 */
export async function handleGetSnapshots(customStorage) {
  const snapshots = await getSnapshotHistory(customStorage);
  return {
    success: true,
    snapshots,
    count: snapshots.length,
    maxLimit: MAX_SNAPSHOTS,
  };
}

/**
 * Handles requests to clear all snapshots and pending scans.
 *
 * @param {Object} [customStorage] - Optional storage area override
 * @returns {Promise<Object>} Response object
 */
export async function handleClearSnapshots(customStorage) {
  await clearSnapshots(customStorage);
  return {
    success: true,
    message: 'All snapshots and pending scan data cleared',
  };
}

/**
 * Handles requests to retrieve intermediate / pending scan data.
 *
 * @param {Object} [customStorage] - Optional storage area override
 * @returns {Promise<Object>} Response object
 */
export async function handleGetPendingData(customStorage) {
  const pending = await getPendingScanData(customStorage);
  return {
    success: true,
    pending,
  };
}

/**
 * Handles requests to calculate relationship sets on ad-hoc inputs without saving.
 *
 * @param {Object} message - Incoming message payload
 * @returns {Promise<Object>} Response object
 */
export async function handleCalculateRelationships(message) {
  const followersList = message.followers ?? [];
  const followingList = message.following ?? [];

  const followersVal = validateUserList(followersList, 'followers');
  if (!followersVal.valid) {
    return { success: false, error: followersVal.error };
  }

  const followingVal = validateUserList(followingList, 'following');
  if (!followingVal.valid) {
    return { success: false, error: followingVal.error };
  }

  const relationships = calculateRelationships(followersVal.users, followingVal.users);
  return {
    success: true,
    ...relationships,
  };
}

/**
 * Master message dispatcher for Chrome runtime messages.
 *
 * @param {Object} message - Incoming message payload
 * @param {Object} [sender] - Chrome message sender details
 * @param {Function} [sendResponse] - Response callback
 * @param {Object} [customStorage] - Optional storage area override for testing
 * @returns {Promise<Object>} Response object delivered to caller
 */
export async function handleMessage(message, sender, sendResponse, customStorage) {
  try {
    if (!message || typeof message !== 'object') {
      const errorRes = {
        success: false,
        error: 'Invalid message payload: expected a non-null object',
      };
      if (typeof sendResponse === 'function') sendResponse(errorRes);
      return errorRes;
    }

    let response;
    switch (message.type) {
      case 'followersData':
        response = await handleFollowersData(message, customStorage);
        break;

      case 'followingData':
        response = await handleFollowingData(message, customStorage);
        break;

      case 'createSnapshot':
        response = await handleCreateSnapshot(message, customStorage);
        break;

      case 'getLatestSnapshot':
        response = await handleGetLatestSnapshot(customStorage);
        break;

      case 'getSnapshots':
      case 'getSnapshotHistory':
        response = await handleGetSnapshots(customStorage);
        break;

      case 'clearSnapshots':
        response = await handleClearSnapshots(customStorage);
        break;

      case 'getPendingData':
        response = await handleGetPendingData(customStorage);
        break;

      case 'calculateRelationships':
        response = await handleCalculateRelationships(message);
        break;

      case 'scanFollowers':
      case 'scanFollowing':
      case 'startScan':
      case 'START_SCAN':
        response = await handleScanRequest(message);
        break;

      default:
        response = {
          success: false,
          error: `Unknown or unsupported message type: "${message.type}"`,
        };
        break;
    }

    if (typeof sendResponse === 'function') {
      sendResponse(response);
    }
    return response;
  } catch (err) {
    const errorResponse = {
      success: false,
      error: err.message || 'Internal service worker error',
    };
    if (typeof sendResponse === 'function') {
      sendResponse(errorResponse);
    }
    return errorResponse;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Chrome Runtime Listener Registration
// ─────────────────────────────────────────────────────────────────────────────
if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    handleMessage(message, sender, sendResponse);
    return true; // Keep asynchronous message channel open
  });
}
