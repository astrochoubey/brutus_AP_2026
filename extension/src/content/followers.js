/**
 * Brutus – Instagram Network Observatory
 * Feature: Instagram Followers Collector
 * Owner:   Kushagra (@nottkushagra)
 *
 * Collects follower usernames from an open Instagram Followers dialog.
 * Triggered on-demand via Chrome runtime message: { type: 'scanFollowers' }
 *
 * Data flow:
 *   Instagram DOM  →  this content script  →  chrome.runtime.sendMessage
 *   →  Prachi's background service worker (serviceWorker.js)
 *
 * Agreed outbound message format:
 *   { type: 'followersData', followers: ['user1', 'user2', …] }
 */

// ─────────────────────────────────────────────────────────────────────
//  Configuration
// ─────────────────────────────────────────────────────────────────────

const FOLLOWERS_CONFIG = Object.freeze({
  SCROLL_DELAY_MS:        1500,     // pause between scrolls for lazy-loading
  MAX_SCROLL_ATTEMPTS:    500,      // hard safety limit on scroll iterations
  STALE_THRESHOLD:        3,        // stop after N scrolls with no new users
  SCROLL_DISTANCE_PX:     600,      // pixels per scroll increment
  BATCH_LOG_INTERVAL:     50,       // log progress every N new usernames
  COLLECTION_TIMEOUT_MS:  300000,   // 5 minute global timeout
});

/**
 * Instagram navigation paths that must never be treated as usernames.
 * Keeps extraction accurate even when the dialog contains non-profile links.
 */
const EXCLUDED_PATHS = new Set([
  'explore', 'accounts', 'direct', 'reels', 'stories',
  'p', 'tv', 'reel', 'about', 'nametag', 'session',
  'emails', 'directory', 'legal', 'privacy', 'terms',
  'api', 'developer', 'web', 'lite', 'static',
]);

const LOG_PREFIX = '[Brutus Followers]';

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
 *  1. Coerce to string, trim whitespace.
 *  2. Strip every leading '@'.
 *  3. Lower-case (Instagram handles are case-insensitive).
 *  4. Validate against Instagram's rules:
 *       – 1-30 characters
 *       – only  a-z  0-9  .  _
 *       – cannot start or end with a period
 *       – no consecutive periods
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
 * @return {boolean} true when the URL or dialog heading indicates the Followers overlay is open
 */
export function isFollowersDialogOpen() {
  if (typeof window === 'undefined') return false;
  const path = (window.location.pathname || '').toLowerCase();
  const search = (window.location.search || '').toLowerCase();
  if (path.includes('/followers') || search.includes('followers')) return true;

  const dialog = document.querySelector('[role="dialog"]');
  if (!dialog) return false;

  // Check dialog title / headings
  const headings = dialog.querySelectorAll('h1, h2, h3, [role="heading"]');
  for (const h of headings) {
    const text = (h.textContent || '').trim().toLowerCase();
    if (text === 'followers') return true;
    if (text === 'following') return false;
  }

  // Check direct title elements in header container
  const headerElem = dialog.querySelector('header') || dialog.firstElementChild;
  if (headerElem) {
    const headerText = (headerElem.textContent || '').trim().toLowerCase();
    if (headerText.startsWith('followers')) return true;
    if (headerText.startsWith('following')) return false;
  }

  // Check tab element if tabbed modal
  const activeTab = dialog.querySelector('[role="tab"][aria-selected="true"]');
  if (activeTab) {
    const tabText = (activeTab.textContent || '').trim().toLowerCase();
    if (tabText.includes('follower')) return true;
    if (tabText.includes('following')) return false;
  }

  return false;
}

/**
 * Locates the visible Followers dialog in the DOM.
 *
 * Strategy (resilient to CSS-class churn):
 *   1. Find every element with role="dialog".
 *   2. Filter to ones that are visible and contain ≥ 1 profile link,
 *      ensuring it is not the Following dialog.
 *   3. Fall back to fixed-position overlays if role="dialog" is absent
 *      but the URL still contains /followers/.
 *
 * @return {Element|null}
 */
export function findFollowersDialog() {
  if (typeof document === 'undefined') return null;
  const dialogs = document.querySelectorAll('[role="dialog"]');
  for (const d of dialogs) {
    if (d.offsetParent === null &&
        getComputedStyle(d).position !== 'fixed') continue;        // hidden

    // Ensure this dialog is not the Following dialog
    const headings = d.querySelectorAll('h1, h2, h3, [role="heading"]');
    let isFollowing = false;
    for (const h of headings) {
      if ((h.textContent || '').trim().toLowerCase() === 'following') {
        isFollowing = true;
        break;
      }
    }
    if (isFollowing) continue;

    if (d.querySelectorAll('a[href^="/"]').length > 0) return d;   // has links
  }

  // Strategy 2 – fallback overlay detection
  if (isFollowersDialogOpen()) {
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
 * Walks descendants looking for an element whose computed overflow-y is
 * 'auto' or 'scroll' AND whose scrollHeight exceeds clientHeight.
 *
 * @param  {Element}       dialog
 * @return {Element|null}
 */
export function findScrollableContainer(dialog) {
  const candidates = dialog.querySelectorAll('*');
  for (const el of candidates) {
    const ov = getComputedStyle(el).overflowY;
    if ((ov === 'auto' || ov === 'scroll') &&
        el.scrollHeight > el.clientHeight &&
        el.querySelectorAll('a[href^="/"]').length >= 1) {
      return el;
    }
  }

  // the dialog itself may be the scroller
  const ov = getComputedStyle(dialog).overflowY;
  if (ov === 'auto' || ov === 'scroll') return dialog;

  return null;
}

// ─────────────────────────────────────────────────────────────────────
//  Username extraction
// ─────────────────────────────────────────────────────────────────────

/**
 * Extracts a normalised username from an <a> element's href.
 * Rejects links that point to Instagram navigation pages rather than
 * user profiles (e.g. /explore/, /direct/, /reels/).
 *
 * @param  {Element}       anchor – an <a> element
 * @return {string|null}
 */
export function extractUsernameFromLink(anchor) {
  if (!anchor || typeof anchor.getAttribute !== 'function') return null;
  const href = anchor.getAttribute('href');
  if (!href) return null;

  // match a single-segment path: /username/ or /username
  const m = href.match(/^\/([^/?#]+)\/?$/);
  if (!m) return null;

  if (EXCLUDED_PATHS.has(m[1].toLowerCase())) return null;

  return normalizeUsername(m[1]);
}

/**
 * Scans a container for profile links and returns a deduplicated Set
 * of normalised usernames.
 *
 * @param  {Element}      container
 * @return {Set<string>}
 */
export function extractUsernamesFromContainer(container) {
  const usernames = new Set();
  const anchors   = container.querySelectorAll('a[href^="/"]');
  for (const a of anchors) {
    const u = extractUsernameFromLink(a);
    if (u) usernames.add(u);
  }
  return usernames;
}

// ─────────────────────────────────────────────────────────────────────
//  Scrolling engine
// ─────────────────────────────────────────────────────────────────────

/**
 * Scrolls a container down by SCROLL_DISTANCE_PX.
 * @param  {Element}  container
 * @return {boolean}  true if the scroll position actually changed
 */
function scrollDown(container) {
  const before = container.scrollTop;
  container.scrollTop += FOLLOWERS_CONFIG.SCROLL_DISTANCE_PX;
  return container.scrollTop !== before;
}

/**
 * Non-blocking pause (gives Instagram time to render new list items).
 * @param  {number}          ms
 * @return {Promise<void>}
 */
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ─────────────────────────────────────────────────────────────────────
//  Core collection logic
// ─────────────────────────────────────────────────────────────────────

/**
 * Collects all follower usernames from the currently-open Followers
 * dialog by iteratively scrolling and extracting links.
 *
 * Procedure:
 *   1. Validate that we are on instagram.com with the dialog open.
 *   2. Locate the dialog and its scrollable child.
 *   3. Extract initial usernames.
 *   4. Scroll → wait → extract, repeating until:
 *        – STALE_THRESHOLD consecutive scrolls yield no new names, OR
 *        – MAX_SCROLL_ATTEMPTS is reached, OR
 *        – COLLECTION_TIMEOUT_MS expires.
 *   5. Return the deduplicated, sorted array plus metadata.
 *
 * @return {Promise<{
 *   success:        boolean,
 *   followers:      string[],
 *   count:          number,
 *   scrollAttempts: number,
 *   elapsedSeconds: number,
 *   partial:        boolean,
 *   error?:         string
 * }>}
 */
export async function collectFollowers() {
  _log('Starting followers collection…');

  // ── environment checks ──────────────────────────────────────────
  if (!isInstagramPage()) {
    const msg = 'Not on an Instagram page. Navigate to instagram.com first.';
    _err(msg);
    return { success: false, followers: [], count: 0,
             scrollAttempts: 0, elapsedSeconds: 0, partial: false, error: msg };
  }

  const dialog = findFollowersDialog();
  if (!dialog && !isFollowersDialogOpen()) {
    const msg = 'Followers dialog is not open. Open a profile and click "followers" first.';
    _err(msg);
    return { success: false, followers: [], count: 0,
             scrollAttempts: 0, elapsedSeconds: 0, partial: false, error: msg };
  }

  if (!dialog) {
    const msg = 'Could not locate the Followers dialog element in the DOM.';
    _err(msg);
    return { success: false, followers: [], count: 0,
             scrollAttempts: 0, elapsedSeconds: 0, partial: false, error: msg };
  }
  _log('Followers dialog located.');

  const scrollable = findScrollableContainer(dialog);
  if (!scrollable) {
    const msg = 'Could not find a scrollable container inside the dialog.';
    _err(msg);
    return { success: false, followers: [], count: 0,
             scrollAttempts: 0, elapsedSeconds: 0, partial: false, error: msg };
  }
  _log('Scrollable container located.');

  // ── scroll-and-extract loop ─────────────────────────────────────
  const allUsernames = new Set();
  let scrollAttempts = 0;
  let staleRuns      = 0;
  let lastSize       = 0;
  let partial        = false;
  const t0           = Date.now();

  // initial pass (before any scrolling)
  for (const u of extractUsernamesFromContainer(scrollable)) allUsernames.add(u);
  _log(`Initial extraction: ${allUsernames.size} unique usernames.`);

  while (scrollAttempts < FOLLOWERS_CONFIG.MAX_SCROLL_ATTEMPTS) {
    // timeout guard
    if (Date.now() - t0 > FOLLOWERS_CONFIG.COLLECTION_TIMEOUT_MS) {
      _warn('Collection timed out after',
            FOLLOWERS_CONFIG.COLLECTION_TIMEOUT_MS / 1000, 's – returning partial results.');
      partial = true;
      break;
    }

    const didScroll = scrollDown(scrollable);
    scrollAttempts++;

    // give Instagram time to lazy-load new entries
    await delay(FOLLOWERS_CONFIG.SCROLL_DELAY_MS);

    // extract from current viewport
    for (const u of extractUsernamesFromContainer(scrollable)) allUsernames.add(u);

    // stale-run detection
    if (allUsernames.size === lastSize) {
      staleRuns++;
      if (!didScroll) staleRuns++; // double-count when scroll didn't move
      if (staleRuns >= FOLLOWERS_CONFIG.STALE_THRESHOLD) {
        _log('No new usernames for', FOLLOWERS_CONFIG.STALE_THRESHOLD,
             'consecutive scrolls – end of list reached.');
        break;
      }
    } else {
      // progress logging
      if (allUsernames.size - lastSize >= FOLLOWERS_CONFIG.BATCH_LOG_INTERVAL ||
          allUsernames.size % FOLLOWERS_CONFIG.BATCH_LOG_INTERVAL === 0) {
        _log(`Progress: ${allUsernames.size} unique usernames collected.`);
      }
      staleRuns = 0;
      lastSize  = allUsernames.size;
    }
  }

  if (scrollAttempts >= FOLLOWERS_CONFIG.MAX_SCROLL_ATTEMPTS) {
    _warn('Hit maximum scroll limit (', FOLLOWERS_CONFIG.MAX_SCROLL_ATTEMPTS,
          ') – returning partial results.');
    partial = true;
  }

  // ── build result ────────────────────────────────────────────────
  const followersArray = Array.from(allUsernames).sort();
  const elapsed = parseFloat(((Date.now() - t0) / 1000).toFixed(1));

  _log(`Collection finished: ${followersArray.length} unique followers,`,
       `${scrollAttempts} scrolls, ${elapsed}s elapsed.`,
       partial ? '(PARTIAL)' : '(COMPLETE)');

  return {
    success:        true,
    followers:      followersArray,
    count:          followersArray.length,
    scrollAttempts,
    elapsedSeconds: elapsed,
    partial,
  };
}

// ─────────────────────────────────────────────────────────────────────
//  Chrome runtime messaging
// ─────────────────────────────────────────────────────────────────────

/**
 * Delivers the collected followers array to Prachi's background service
 * worker using the agreed message schema.
 *
 * Message: { type: 'followersData', followers: [...], timestamp, source }
 *
 * @param  {string[]}       followers
 * @return {Promise<void>}
 */
async function sendFollowersToBackground(followers) {
  const message = {
    type:          'followersData',
    followers,
    forceSnapshot: true,
    timestamp:     new Date().toISOString(),
    source:        'content/followers.js',
  };

  try {
    const response = await chrome.runtime.sendMessage(message);
    _log('Followers data sent to background.', response || '');
  } catch (err) {
    // Expected until Prachi's handler is wired up
    _warn('Background did not acknowledge (handler may not exist yet):',
          err.message);
  }
}

// ─────────────────────────────────────────────────────────────────────
//  Message listener  –  trigger interface
// ─────────────────────────────────────────────────────────────────────
//
//  Agreed trigger message:  { type: 'scanFollowers' }
//
//  This listener can be activated in two ways:
//    A. Prachi adds this file to manifest.json content_scripts so it is
//       auto-injected on instagram.com pages.
//    B. The background uses chrome.scripting.executeScript() to inject
//       this file on demand (the "scripting" permission already exists).
//
//  In either case the popup or background sends the trigger message, and
//  this listener starts collection and responds with the result object.
// ─────────────────────────────────────────────────────────────────────

if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message && (message.type === 'scanFollowers' || message.type === 'startScan' || message.type === 'scan')) {
      const dialog = findFollowersDialog();
      const isOpen = isFollowersDialogOpen() || (dialog !== null);
      if (!isOpen) {
        return false; // Not a followers dialog, let following.js handle it
      }

      _log('Received scan trigger for followers.');

      collectFollowers()
        .then(async (result) => {
          if (result.success && result.followers.length > 0) {
            await sendFollowersToBackground(result.followers);
          }
          sendResponse(result);
        })
        .catch((err) => {
          _err('Collection failed with exception:', err);
          sendResponse({
            success:        false,
            followers:      [],
            count:          0,
            scrollAttempts: 0,
            elapsedSeconds: 0,
            partial:        false,
            error:          err.message || 'Unknown collection error',
          });
        });

      return true; // keep the message channel open for async sendResponse
    }
  });

  _log('Collector loaded. Send { type: "scanFollowers" } to begin.');
}
