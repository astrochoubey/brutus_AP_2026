/**
 * Brutus – Instagram Network Observatory
 * Feature: Instagram Following Collector
 * Owner:   Kushagra (@nottkushagra) / Integrated by Priyanshu
 *
 * Collects accounts the user follows from an open Instagram Following dialog.
 * Triggered on-demand via Chrome runtime message: { type: 'scanFollowing' }
 * Also auto-handles generic { type: 'scan' } / { type: 'startScan' } when Following dialog is open.
 *
 * Data flow:
 *   Instagram DOM  →  this content script  →  chrome.runtime.sendMessage
 *   →  Prachi's background service worker (serviceWorker.js)
 *
 * Agreed outbound message format:
 *   { type: 'followingData', following: ['user1', 'user2', …], source: 'content/following.js', forceSnapshot: true }
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
  if (typeof window === 'undefined') return false;
  const h = window.location.hostname;
  return h === 'www.instagram.com' || h === 'instagram.com';
}

/**
 * Locates the visible Following dialog in the DOM.
 *
 * Instagram DOM Strategy:
 * 1. Locate all [role="dialog"] overlays that are currently visible.
 * 2. In modern Instagram Web, header text ("Following") is often rendered inside
 *    a simple <div> or <span> instead of an <h1>-<h3> or [role="heading"].
 * 3. In the Following dialog, every followed row has an action button with text "Following".
 *    In the Followers dialog, buttons say "Remove" or "Follow".
 * 4. This makes button text + heading inspection 100% deterministic.
 *
 * @return {Element|null}
 */
export function findFollowingDialog() {
  if (typeof document === 'undefined') return null;

  const dialogs = document.querySelectorAll('[role="dialog"]');
  for (const d of dialogs) {
    // Skip if hidden
    if (d.offsetParent === null && getComputedStyle(d).position !== 'fixed') {
      continue;
    }

    // Check button texts in the dialog
    const buttons = Array.from(d.querySelectorAll('button'));
    const btnTexts = buttons.map((b) => (b.textContent || '').trim().toLowerCase());
    const hasFollowingButton = btnTexts.some((t) => t === 'following');
    const hasRemoveButton = btnTexts.some((t) => t === 'remove');

    // If it has "Remove" buttons, it is the Followers dialog, not Following
    if (hasRemoveButton && !hasFollowingButton) {
      continue;
    }

    // Check title elements (spans, divs, headings with short text)
    const titleCandidates = d.querySelectorAll('h1, h2, h3, [role="heading"], div, span');
    let hasFollowingTitle = false;
    let hasFollowersTitle = false;

    for (const el of titleCandidates) {
      // Check leaf or near-leaf elements to avoid matching full container text
      if (el.children.length <= 1) {
        const text = (el.textContent || '').trim().toLowerCase();
        if (text === 'following') {
          hasFollowingTitle = true;
          break;
        }
        if (text === 'followers') {
          hasFollowersTitle = true;
        }
      }
    }

    // If explicit "followers" title found and no "following" title, skip
    if (hasFollowersTitle && !hasFollowingTitle) {
      continue;
    }

    // Positive identification: explicit title OR action buttons in rows
    if (hasFollowingTitle || hasFollowingButton) {
      return d;
    }

    // Fallback: dialog has profile links and no "followers" indication
    if (!hasFollowersTitle && d.querySelectorAll('a[href^="/"]').length > 0) {
      return d;
    }
  }

  // Fallback fixed-position overlay detection
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
 * @return {boolean} true when URL or dialog indicates Following overlay is open
 */
export function isFollowingDialogOpen() {
  if (typeof window === 'undefined') return false;

  const path = (window.location.pathname || '').toLowerCase();
  const search = (window.location.search || '').toLowerCase();
  if (path.includes('/following') || search.includes('following')) return true;

  const dialog = document.querySelector('[role="dialog"]');
  if (!dialog) return false;

  // Check action buttons inside dialog
  const buttons = Array.from(dialog.querySelectorAll('button'));
  const btnTexts = buttons.map((b) => (b.textContent || '').trim().toLowerCase());
  if (btnTexts.some((t) => t === 'following')) return true;
  if (btnTexts.some((t) => t === 'remove')) return false;

  // Check title candidates
  const titleCandidates = dialog.querySelectorAll('h1, h2, h3, [role="heading"], div, span');
  for (const el of titleCandidates) {
    if (el.children.length <= 1) {
      const text = (el.textContent || '').trim().toLowerCase();
      if (text === 'following') return true;
      if (text === 'followers') return false;
    }
  }

  return false;
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

  let dialog = findFollowingDialog();
  if (!dialog && !isFollowingDialogOpen()) {
    const msg = 'Following dialog is not open. Open your profile and click "following" first.';
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
    return response;
  } catch (err) {
    _warn('Background did not acknowledge:', err.message);
    return null;
  }
}

/**
 * Orchestrates Following collection with automatic profile link clicking if not open.
 */
export async function executeFollowingCollection() {
  let dialog = findFollowingDialog();
  let isOpen = isFollowingDialogOpen() || (dialog !== null);

  if (!isOpen) {
    // If Following dialog not open, find Following link on profile and click it
    const followingLink = document.querySelector('a[href$="/following/"], a[href*="/following"]');
    if (followingLink) {
      _log('Following dialog not open. Clicking profile following link…');
      followingLink.click();
      await delay(1200);
      dialog = findFollowingDialog();
      isOpen = isFollowingDialogOpen() || (dialog !== null);
    }
  }

  if (!isOpen) {
    return {
      success: false,
      following: [],
      count: 0,
      scrollAttempts: 0,
      elapsedSeconds: 0,
      partial: false,
      error: 'Following dialog is not open. Please click "following" on your Instagram profile to open the list, then click Scan Following.',
    };
  }

  _log('Received scan trigger for following dialog.');
  try {
    const result = await collectFollowing();
    if (result.success && result.following.length > 0) {
      await sendFollowingToBackground(result.following);
    }
    return result;
  } catch (err) {
    _err('Following collection failed with exception:', err);
    return {
      success:        false,
      following:      [],
      count:          0,
      scrollAttempts: 0,
      elapsedSeconds: 0,
      partial:        false,
      error:          err.message || 'Unknown collection error',
    };
  }
}

// ─────────────────────────────────────────────────────────────────────
//  Message listener
// ─────────────────────────────────────────────────────────────────────

if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (!message) return false;

    // 1. Explicit following scan request
    if (message.type === 'scanFollowing') {
      executeFollowingCollection().then(sendResponse);
      return true;
    }

    // 2. Generic scan trigger: if Following dialog is open, handle it
    if (message.type === 'startScan' || message.type === 'scan' || message.type === 'scanFollowers') {
      const dialog = findFollowingDialog();
      const isOpen = isFollowingDialogOpen() || (dialog !== null);
      if (isOpen) {
        _log('Detected active Following dialog for generic scan trigger.');
        executeFollowingCollection().then(sendResponse);
        return true;
      }
      return false; // Let followers.js handle it
    }

    return false;
  });

  _log('Following collector loaded. Send { type: "scanFollowing" } to begin.');
}
