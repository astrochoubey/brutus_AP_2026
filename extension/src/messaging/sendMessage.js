// sendMessage.js
// A simple promise wrapper around chrome.runtime.sendMessage.
//
// COLLABORATION NOTE:
// Prachi will implement the full message handler in the service worker.
// This wrapper is owned by Priyanshu (UI side) to send messages from popup/dashboard.
//
// If the service worker is not running, sendChromeMessage rejects with an error
// and the UI shows an appropriate empty/error state.

/**
 * Sends a typed message to the background service worker and returns a Promise.
 *
 * @param {string} action  - One of the MSG constants from messageTypes.js
 * @param {Object} payload - Optional data to send with the message
 * @returns {Promise<any>} - Resolves with the response or rejects on error
 */
export function sendChromeMessage(action, payload = {}) {
  return new Promise((resolve, reject) => {
    // chrome.runtime is only available inside the extension context.
    // Guard so the React dev server can still render without crashing.
    if (typeof chrome === 'undefined' || !chrome.runtime) {
      reject(new Error('Chrome runtime not available. Running outside extension context.'));
      return;
    }

    chrome.runtime.sendMessage({ action, ...payload }, (response) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
      } else {
        resolve(response);
      }
    });
  });
}
