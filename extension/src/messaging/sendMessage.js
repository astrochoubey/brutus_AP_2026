// sendMessage.js
// A simple promise wrapper around chrome.runtime.sendMessage.
// Compatible with Prachi's handleMessage dispatcher (which uses message.type).

/**
 * Sends a typed message to the background service worker and returns a Promise.
 *
 * @param {string} action  - One of the MSG or MESSAGE_TYPES action strings
 * @param {Object} payload - Optional data to send with the message
 * @returns {Promise<any>} - Resolves with the response or rejects on error
 */
export function sendChromeMessage(action, payload = {}) {
  return new Promise((resolve, reject) => {
    // Guard so React tests or outside browser runs don't crash.
    if (typeof chrome === 'undefined' || !chrome.runtime) {
      reject(new Error('Chrome runtime not available. Running outside extension context.'));
      return;
    }

    chrome.runtime.sendMessage({ type: action, action, ...payload }, (response) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
      } else {
        resolve(response);
      }
    });
  });
}
