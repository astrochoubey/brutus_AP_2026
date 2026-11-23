/**
 * Brutus – Instagram Network Observatory
 * Feature: Instagram Following Collector
 * Owner:   Kushagra (@nottkushagra)
 *
 * Collects accounts the user follows from an open Instagram Following dialog.
 * Triggered on-demand via Chrome runtime message: { type: 'scanFollowing' }
 *
 * Data flow:
 *   Instagram DOM  →  this content script  →  chrome.runtime.sendMessage
 *   →  Prachi's background service worker (serviceWorker.js)
 *
 * Agreed outbound message format:
 *   { type: 'followingData', following: ['user1', 'user2', …], source: 'content/following.js' }
 */

// ─────────────────────────────────────────────────────────────────────
//  Configuration
// ─────────────────────────────────────────────────────────────────────

const FOLLOWING_CONFIG = Object.freeze({
  SCROLL_DELAY_MS:        1500,     // pause between scrolls for lazy-loading
  MAX_SCROLL_ATTEMPTS:    500,      // hard safety limit on scroll iterations
  STALE_THRESHOLD:        3,        // stop after N scrolls with no new users
  SCROLL_DISTANCE_PX:     600,      // pixels per scroll increment
  BATCH_LOG_INTERVAL:     50,       // log progress every N new usernames
  COLLECTION_TIMEOUT_MS:  300000,   // 5 minute global timeout
});

/**
 * Instagram navigation paths that must never be treated as usernames.
 */
const EXCLUDED_PATHS = new Set([
  'explore', 'accounts', 'direct', 'reels', 'stories',
  'p', 'tv', 'reel', 'about', 'nametag', 'session',
  'emails', 'directory', 'legal', 'privacy', 'terms',
  'api', 'developer', 'web', 'lite', 'static',
]);

const LOG_PREFIX = '[Brutus Following]';

// ─────────────────────────────────────────────────────────────────────
//  Logging helpers
// ─────────────────────────────────────────────────────────────────────

function _log(...args)  { console.log(LOG_PREFIX, ...args); }
function _warn(...args) { console.warn(LOG_PREFIX, ...args); }
function _err(...args)  { console.error(LOG_PREFIX, ...args); }

// ─────────────────────────────────────────────────────────────────────
//  Username normalisation
// ─────────────────────────────────────────────────────────────────────

/**
 * Normalises a raw username string extracted from the DOM.
 *
 * @param  {*}            raw  – value pulled from the DOM
 * @return {string|null}       – clean username, or null if invalid
 */
export function normalizeUsername(raw) {
  if (raw == null) return null;

  let u = String(raw).trim();

  // strip leading @ symbols
  while (u.startsWith('@')) u = u.slice(1);

  u = u.toLowerCase();

  if (u.length === 0 || u.length > 30) return null;
  if (!/^[a-z0-9._]+$/.test(u))       return null;
  if (u.startsWith('.') || u.endsWith('.')) return null;
  if (u.includes('..'))               return null;

  return u;
}

// ─────────────────────────────────────────────────────────────────────
//  DOM detection
// ─────────────────────────────────────────────────────────────────────

/**
 * @return {boolean} true when the host is instagram.com
 */
export function isInstagramPage() {
  const h = window.location.hostname;
  return h === 'www.instagram.com' || h === 'instagram.com';
}

/**
 * @return {boolean} true when the URL or DOM indicates the Following overlay is open
 */
export function isFollowingDialogOpen() {
  if (window.location.pathname.includes('/following')) return true;
  const dialog = document.querySelector('[role="dialog"]');
  if (dialog) {
    const text = dialog.textContent || '';
    if (/following/i.test(text)) return true;
  }
  return false;
}

/**
 * Locates the visible Following dialog in the DOM.
 *
 * @return {Element|null}
 */
export function findFollowingDialog() {
  const dialogs = document.querySelectorAll('[role="dialog"]');
  for (const d of dialogs) {
    if (d.offsetParent === null &&
        getComputedStyle(d).position !== 'fixed') continue; // hidden
    if (d.querySelectorAll('a[href^="/"]').length > 0) return d;
  }

  // Fallback overlay detection
  if (isFollowingDialogOpen()) {
    const overlays = document.querySelectorAll(
      'div[style*="position: fixed"], div[style*="overflow"]'
    );
    for (const o of overlays) {
      if (o.querySelectorAll('a[href^="/"]').length >= 2) return o;
    }
  }

  return null;
}

/**
 * Finds the scrollable list container inside a dialog.
 *
 * @param  {Element}       dialog
 * @return {Element|null}
 */
export function findScrollableContainer(dialog) {
  if (!dialog) return null;
  const candidates = dialog.querySelectorAll('*');
  for (const el of candidates) {
    const ov = getComputedStyle(el).overflowY;
    if ((ov === 'auto' || ov === 'scroll') &&
        el.scrollHeight > el.clientHeight &&
        el.querySelectorAll('a[href^="/"]').length >= 1) {
      return el;
    }
  }

  const ov = getComputedStyle(dialog).overflowY;
  if (ov === 'auto' || ov === 'scroll') return dialog;

  return null;
}

// ─────────────────────────────────────────────────────────────────────
//  Username extraction
// ─────────────────────────────────────────────────────────────────────

/**
 * Extracts a normalised username from an <a> element's href.
 *
 * @param  {Element}       anchor
 * @return {string|null}
 */
export function extractUsernameFromLink(anchor) {
  if (!anchor || typeof anchor.getAttribute !== 'function') return null;
  const href = anchor.getAttribute('href');
  if (!href) return null;

  const m = href.match(/^\/([^/?#]+)\/?$/);
  if (!m) return null;

  if (EXCLUDED_PATHS.has(m[1].toLowerCase())) return null;

  return normalizeUsername(m[1]);
}

/**
 * Scans a container for profile links and returns a deduplicated Set.
 *
 * @param  {Element}      container
 * @return {Set<string>}
 */
export function extractUsernamesFromContainer(container) {
  const usernames = new Set();
  if (!container || typeof container.querySelectorAll !== 'function') return usernames;
  const anchors = container.querySelectorAll('a[href^="/"]');
  for (const a of anchors) {
    const u = extractUsernameFromLink(a);
    if (u) usernames.add(u);
  }
  return usernames;
}

// ─────────────────────────────────────────────────────────────────────
//  Scrolling engine
// ─────────────────────────────────────────────────────────────────────

function scrollDown(container) {
  const before = container.scrollTop;
  container.scrollTop += FOLLOWING_CONFIG.SCROLL_DISTANCE_PX;
  return container.scrollTop !== before;
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ─────────────────────────────────────────────────────────────────────
//  Core collection logic
// ─────────────────────────────────────────────────────────────────────

/**
 * Collects all following usernames from the open Following dialog.
 *
 * @return {Promise<{
 *   success:        boolean,
 *   following:      string[],
 *   count:          number,
 *   scrollAttempts: number,
 *   elapsedSeconds: number,
 *   partial:        boolean,
 *   error?:         string
 * }>}
 */
export async function collectFollowing() {
  _log('Starting following collection…');

  if (!isInstagramPage()) {
    const msg = 'Not on an Instagram page. Navigate to instagram.com first.';
    _err(msg);
    return { success: false, following: [], count: 0,
             scrollAttempts: 0, elapsedSeconds: 0, partial: false, error: msg };
  }

  const dialog = findFollowingDialog();
  if (!dialog && !isFollowingDialogOpen()) {
    const msg = 'Following dialog is not open. Open a profile and click "following" first.';
    _err(msg);
    return { success: false, following: [], count: 0,
             scrollAttempts: 0, elapsedSeconds: 0, partial: false, error: msg };
  }

  if (!dialog) {
    const msg = 'Could not locate the Following dialog element in the DOM.';
    _err(msg);
    return { success: false, following: [], count: 0,
             scrollAttempts: 0, elapsedSeconds: 0, partial: false, error: msg };
  }
  _log('Following dialog located.');

  const scrollable = findScrollableContainer(dialog);
  if (!scrollable) {
    const msg = 'Could not find a scrollable container inside the dialog.';
    _err(msg);
    return { success: false, following: [], count: 0,
             scrollAttempts: 0, elapsedSeconds: 0, partial: false, error: msg };
  }
  _log('Scrollable container located.');

  const allUsernames = new Set();
  let scrollAttempts = 0;
  let staleRuns      = 0;
  let lastSize       = 0;
  let partial        = false;
  const t0           = Date.now();

  for (const u of extractUsernamesFromContainer(scrollable)) allUsernames.add(u);
  _log(`Initial extraction: ${allUsernames.size} unique following usernames.`);

  while (scrollAttempts < FOLLOWING_CONFIG.MAX_SCROLL_ATTEMPTS) {
    if (Date.now() - t0 > FOLLOWING_CONFIG.COLLECTION_TIMEOUT_MS) {
      _warn('Collection timed out – returning partial results.');
      partial = true;
      break;
    }

    const didScroll = scrollDown(scrollable);
    scrollAttempts++;

    await delay(FOLLOWING_CONFIG.SCROLL_DELAY_MS);

    for (const u of extractUsernamesFromContainer(scrollable)) allUsernames.add(u);

    if (allUsernames.size === lastSize) {
      staleRuns++;
      if (!didScroll) staleRuns++;
      if (staleRuns >= FOLLOWING_CONFIG.STALE_THRESHOLD) {
        _log('No new usernames for', FOLLOWING_CONFIG.STALE_THRESHOLD, 'consecutive scrolls – end reached.');
        break;
      }
    } else {
      if (allUsernames.size - lastSize >= FOLLOWING_CONFIG.BATCH_LOG_INTERVAL ||
          allUsernames.size % FOLLOWING_CONFIG.BATCH_LOG_INTERVAL === 0) {
        _log(`Progress: ${allUsernames.size} following collected.`);
      }
      staleRuns = 0;
      lastSize  = allUsernames.size;
    }
  }

  if (scrollAttempts >= FOLLOWING_CONFIG.MAX_SCROLL_ATTEMPTS) {
    partial = true;
  }

  const followingArray = Array.from(allUsernames).sort();
  const elapsed = parseFloat(((Date.now() - t0) / 1000).toFixed(1));

  _log(`Collection finished: ${followingArray.length} unique following,`,
       `${scrollAttempts} scrolls, ${elapsed}s elapsed.`);

  return {
    success:        true,
    following:      followingArray,
    count:          followingArray.length,
    scrollAttempts,
    elapsedSeconds: elapsed,
    partial,
  };
}

// ─────────────────────────────────────────────────────────────────────
//  Chrome runtime messaging
// ─────────────────────────────────────────────────────────────────────

async function sendFollowingToBackground(following) {
  const message = {
    type:          'followingData',
    following,
    forceSnapshot: true,
    timestamp:     new Date().toISOString(),
    source:        'content/following.js',
  };

  try {
    const response = await chrome.runtime.sendMessage(message);
    _log('Following data sent to background.', response || '');
  } catch (err) {
    _warn('Background did not acknowledge:', err.message);
  }
}

// ─────────────────────────────────────────────────────────────────────
//  Message listener
// ─────────────────────────────────────────────────────────────────────

if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message && (message.type === 'scanFollowing' || ((message.type === 'scanFollowers' || message.type === 'startScan') && isFollowingDialogOpen()))) {
      _log('Received scan trigger for following.');

      collectFollowing()
        .then(async (result) => {
          if (result.success && result.following.length > 0) {
            await sendFollowingToBackground(result.following);
          }
          sendResponse(result);
        })
        .catch((err) => {
          _err('Following collection failed with exception:', err);
          sendResponse({
            success:        false,
            following:      [],
            count:          0,
            scrollAttempts: 0,
            elapsedSeconds: 0,
            partial:        false,
            error:          err.message || 'Unknown collection error',
          });
        });

      return true;
    }
  });

  _log('Following collector loaded. Send { type: "scanFollowing" } to begin.');
}
