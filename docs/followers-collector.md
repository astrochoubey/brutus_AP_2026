# Instagram Followers Collector — Technical Documentation

**Feature owner:** Kushagra (@nottkushagra)
**File:** `extension/src/content/followers.js`
**Branch:** `feature/kushagra-followers-collector`

---

## Overview

This content script collects follower usernames from an open Instagram
Followers dialog. It runs **only on demand** — the user must have the
dialog already open and explicitly trigger collection via a Chrome
runtime message.

```
Instagram DOM  →  followers.js  →  chrome.runtime.sendMessage
                                       →  Prachi's background service worker
```

---

## How Collection Is Triggered

The script listens for a Chrome runtime message:

```json
{ "type": "scanFollowers" }
```

This message should be sent by the popup (Priyanshu) or the background
service worker (Prachi). The collector does **not** automatically run
when the page loads.

> **Integration dependency:** Prachi must register `followers.js` in
> `manifest.json` under `content_scripts`, or inject it on demand via
> `chrome.scripting.executeScript()` (the `"scripting"` permission
> already exists in the manifest).

---

## How the Followers Dialog Is Identified

Instagram displays followers in a modal overlay. The script locates it
using **structural attributes** rather than fragile CSS class names:

| Strategy | Method |
|----------|--------|
| Primary  | Query all elements with `role="dialog"`, filter to those that are visible and contain at least one `<a href="/">` profile link. |
| Fallback | If the URL contains `/followers/` but no `role="dialog"` is found, scan fixed-position `<div>` elements for containers with ≥ 2 profile links. |

The URL check (`/followers/` in pathname) serves as a prerequisite gate
before the dialog search begins.

---

## How the Scrollable Container Is Found

Inside the dialog the script walks all descendants looking for an
element whose `computed overflow-y` is `auto` or `scroll` **and** whose
`scrollHeight > clientHeight` (i.e. it actually overflows). It also
verifies the candidate contains profile links.

If no child matches, the dialog element itself is tested as a fallback.

---

## How Usernames Are Extracted

```
<a href="/alice/">  →  match /^\/([^/?#]+)\/?$/  →  "alice"
```

1. Query all `<a>` elements whose `href` starts with `/`.
2. Match against a single-segment path regex.
3. Reject the match if the segment is a known Instagram navigation path
   (`explore`, `direct`, `reels`, `accounts`, etc.) — maintained in
   the `EXCLUDED_PATHS` set.
4. Pass the candidate through `normalizeUsername()`.

---

## How Usernames Are Normalised

`normalizeUsername(raw)` applies these transformations in order:

1. Coerce to string, trim whitespace.
2. Strip every leading `@` character.
3. Convert to lower case (Instagram handles are case-insensitive).
4. Validate:
   - Length 1–30.
   - Only characters `a-z`, `0-9`, `.`, `_`.
   - Does not start or end with `.`.
   - No consecutive periods (`..`).
5. Return the clean string, or `null` if any check fails.

---

## How Duplicates Are Removed

A `Set<string>` accumulates every normalised username across all scroll
iterations. Because Set enforces uniqueness, duplicates are eliminated
at insertion time — no post-processing pass is needed.

The final array is built with `Array.from(set).sort()`.

---

## How the Scrolling Mechanism Works

```
┌──────────────┐
│  initial     │  extract usernames before first scroll
│  extraction  │
└──────┬───────┘
       ▼
┌──────────────┐     staleRuns ≥ 3 ──────► STOP
│  scroll down │───► extract ──► new?
│  600 px      │                   │ yes
│  wait 1.5 s  │◄──────────────────┘
└──────────────┘     scrollAttempts ≥ 500 ► STOP (partial)
                     elapsed > 300 s ─────► STOP (partial)
```

| Parameter | Default | Purpose |
|-----------|---------|---------|
| `SCROLL_DELAY_MS` | 1500 | Wait between scrolls for lazy-loading |
| `MAX_SCROLL_ATTEMPTS` | 500 | Hard safety cap to prevent infinite loops |
| `STALE_THRESHOLD` | 3 | Consecutive fruitless scrolls before stopping |
| `SCROLL_DISTANCE_PX` | 600 | Pixels scrolled per iteration |
| `COLLECTION_TIMEOUT_MS` | 300 000 | 5-minute global timeout |

Stale detection counts faster when the scroll position itself did not
advance (indicating we have truly reached the bottom).

---

## How Chrome Messaging Works

### Outbound message (after successful collection)

```js
chrome.runtime.sendMessage({
  type:      'followersData',       // agreed schema
  followers: ['alice', 'bob', …],   // sorted, deduplicated
  timestamp: '2026-11-23T…',        // ISO string
  source:    'content/followers.js'
});
```

This is the format agreed with Prachi's background module.

### Inbound trigger

```js
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'scanFollowers') {
    // runs collectFollowers(), then sendResponse(result)
    return true; // async
  }
});
```

The response object returned through `sendResponse` contains:

```js
{
  success:        true,
  followers:      ['alice', 'bob'],
  count:          2,
  scrollAttempts: 14,
  elapsedSeconds: 21.5,
  partial:        false,       // true if timed out / hit limit
  error:          undefined    // present only on failure
}
```

---

## Error Handling Summary

| Situation | Behaviour |
|-----------|-----------|
| Not on Instagram | Returns `{ success: false, error: '…' }` |
| Followers dialog not open | Returns `{ success: false, error: '…' }` |
| Dialog element not found in DOM | Returns `{ success: false, error: '…' }` |
| No scrollable container | Returns `{ success: false, error: '…' }` |
| Zero followers extracted | Returns `{ success: true, count: 0 }` — honest report |
| Timeout / scroll limit hit | Returns `{ success: true, partial: true }` |
| `chrome.runtime.sendMessage` fails | Logs a warning, does **not** crash |

The script **never** reports a partial scan as a complete scan.

---

## Integration Dependencies

| Dependency | Owner | Action required |
|------------|-------|-----------------|
| Register `followers.js` as a content script (or inject on demand) | Prachi | Add to `manifest.json` `content_scripts[].js` array, or inject via `chrome.scripting.executeScript` in `serviceWorker.js` |
| Implement `followersData` message handler in background | Prachi | Add an `onMessage` handler in `serviceWorker.js` for `{ type: 'followersData' }` |
| Send `scanFollowers` trigger from the popup UI | Priyanshu | Add a button/action in the popup that sends `{ type: 'scanFollowers' }` to the active tab |

None of these dependencies block the development or testing of this
module — `followers.js` works independently and logs results to the
console even without the other modules connected.
