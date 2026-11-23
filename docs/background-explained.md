# Background Service Worker & Storage — Technical Documentation

**Feature owner:** Prachi (@astrochoubey)  
**Files:**  
- `extension/manifest.json`  
- `extension/src/background/serviceWorker.js`  
- `extension/background.js`  
- `extension/src/utils/storage.js`  
- `extension/src/storage/snapshots.js`  
- `extension/src/storage/chromeStorage.js`  
- `extension/src/messaging/messageTypes.js`  
- `tests/javascript/background.test.js`  
**Branch:** `feature/prachi-background-storage`  

---

## 1. Overview & Architecture

The Background Service Worker serves as the central data coordination, processing, and persistence engine for the Brutus Chrome Extension. Built on the Chrome Extensions Manifest V3 service worker lifecycle, it operates event-driven and asynchronously.

```
┌─────────────────────────────────┐       ┌─────────────────────────────────┐
│ Kushagra's Content Scripts      │       │ Priyanshu's Popup UI            │
│ (followers.js / following.js)   │       │ (popup.js / Dashboard)          │
└────────────────┬────────────────┘       └────────────────┬────────────────┘
                 │                                         │
                 │ chrome.runtime.sendMessage              │ chrome.runtime.sendMessage
                 │ ({ type: 'followersData', ... })        │ ({ type: 'getLatestSnapshot' })
                 ▼                                         ▼
┌───────────────────────────────────────────────────────────────────────────┐
│                  Prachi's Background Service Worker                       │
│                   (src/background/serviceWorker.js)                       │
│                                                                           │
│  ┌───────────────────────┐              ┌──────────────────────────────┐  │
│  │   Message Router      │─────────────►│ Data Validation & Cleaner    │  │
│  │   (handleMessage)     │              │ (validateUserList)           │  │
│  └───────────────────────┘              └──────────────┬───────────────┘  │
│                                                        │                  │
│  ┌───────────────────────┐              ┌──────────────▼───────────────┐  │
│  │ Snapshot Pruning      │◄─────────────│ Set Relationship Engine      │  │
│  │ (Max 10 FIFO Cap)     │              │ (calculateRelationships)     │  │
│  └───────────┬───────────┘              └──────────────────────────────┘  │
└──────────────┼────────────────────────────────────────────────────────────┘
               ▼
┌───────────────────────────────────────────────────────────────────────────┐
│                      Persistent Storage Layer                             │
│       chrome.storage.local (with MemoryStorage unit test fallback)        │
│                                                                           │
│   • brutus_snapshots       : Historical array [Snapshot_1, ... 10]       │
│   • brutus_latest_snapshot : Most recent snapshot record                  │
│   • brutus_pending_scan    : Buffered intermediate scan data              │
└───────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Manifest V3 Configuration

In `extension/manifest.json`:
1. The service worker is configured as an ES module:
   ```json
   "background": {
     "service_worker": "src/background/serviceWorker.js",
     "type": "module"
   }
   ```
   This enables native ES imports (`import ... from '...'`) within the background context without bundling hurdles.
2. Kushagra's followers collector is registered under `content_scripts`:
   ```json
   "content_scripts": [
     {
       "matches": ["https://*.instagram.com/*"],
       "js": ["src/content/instagram.js", "src/content/followers.js"]
     }
   ]
   ```
3. Permissions `"storage"`, `"activeTab"`, and `"scripting"` grant full access to `chrome.storage.local` and tab interactions.

---

## 3. Chrome Runtime Message Flow

The service worker registers a listener on `chrome.runtime.onMessage` using `handleMessage`. Because storage operations are asynchronous, the listener returns `true` to keep the message channel open.

### Supported Action Types

| Action Type (`message.type`) | Payload Parameters | Returns | Description |
|------------------------------|-------------------|---------|-------------|
| `followersData` | `followers: string[]`, `timestamp?`, `source?`, `forceSnapshot?` | `{ success, snapshotCreated, ... }` | Ingests follower scan data from Kushagra's collector, buffers to pending scan, and generates a snapshot if following is already present. |
| `followingData` | `following: string[]`, `timestamp?`, `source?`, `forceSnapshot?` | `{ success, snapshotCreated, ... }` | Ingests following scan data, buffers to pending scan, and generates a snapshot if followers is already present. |
| `createSnapshot` | `followers: string[]`, `following: string[]`, `metadata?` | `{ success, snapshot, stats, totalSnapshots }` | Manually compiles and stores a snapshot with given follower and following lists. |
| `getLatestSnapshot` | None | `{ success, snapshot }` | Fetches the most recent snapshot for instant rendering in Priyanshu's popup. |
| `getSnapshots` / `getSnapshotHistory` | None | `{ success, snapshots, count, maxLimit }` | Fetches historical snapshots (up to 10) for trend analysis. |
| `clearSnapshots` | None | `{ success: true }` | Clears all stored snapshots and pending scans. |
| `getPendingData` | None | `{ success, pending }` | Checks intermediate buffered scan data. |
| `calculateRelationships` | `followers: string[]`, `following: string[]` | `{ success, mutuals, dontFollowBack, notFollowedBack, stats }` | Pure computation on arbitrary user sets without saving to storage. |

### Two-Stage Scan Coordination

Instagram modals show followers and following in separate dialogs. The service worker orchestrates them seamlessly:
1. When `followersData` arrives first, it is validated and saved to `brutus_pending_scan.followers`.
2. The service worker returns `{ success: true, pendingFollowing: true }`.
3. When `followingData` subsequently arrives, the service worker detects the pending followers data, combines them into a full snapshot, writes to storage, and clears the pending buffer.
4. The same automatic completion works in reverse if `followingData` arrives before `followersData`.

---

## 4. Data Validation & Normalization

All incoming user lists pass through `validateUserList(list, fieldName)`:

1. **Payload Structure:** Rejects non-array inputs (`null`, primitives, objects) with descriptive errors.
2. **String Sanitization:** Calls `normalizeUsername(raw)`:
   - Coerces to string and trims leading/trailing whitespace.
   - Strips leading `@` characters (`@alice` $\rightarrow$ `alice`).
   - Converts to lowercase (Instagram handles are case-insensitive).
   - Validates length (1 to 30 characters).
   - Ensures valid characters (`a-z`, `0-9`, `.`, `_`).
   - Rejects leading/trailing periods or consecutive periods (`..`).
   - Handles user objects containing `{ username: "..." }` or `{ id: "..." }`.
3. **Deduplication & Sorting:** Accumulates unique handles in a `Set` and outputs a sorted array.

---

## 5. Set-Based Relationship Calculations

The mathematical engine partitions the graph into three mutually exclusive subsets:

$$\text{Mutuals} = \text{Followers} \cap \text{Following}$$
$$\text{Don't Follow Back (Unreciprocated)} = \text{Following} \setminus \text{Followers}$$
$$\text{Not Followed Back (Fans)} = \text{Followers} \setminus \text{Following}$$

### Complexity:
- Constructing `Set(Followers)` and `Set(Following)`: $O(N + M)$
- Classification iterations: $O(N + M)$
- Total time complexity: **$O(N + M)$ linear time**, far outperforming nested loops.

### Statistics Computed:
- `followersCount`: Total unique followers
- `followingCount`: Total unique accounts followed
- `mutualsCount`: Size of intersection
- `dontFollowBackCount`: Following who do not follow back
- `notFollowedBackCount`: Followers not followed back
- `reciprocityRate`: $\frac{\text{mutualsCount}}{\text{followingCount}}$ (rounded to 4 decimal places)

---

## 6. Snapshot Schema & 10-Snapshot FIFO Cap

Each snapshot produced by `createSnapshot()` has the following structure:

```json
{
  "id": "snapshot_1700000000000_abc12",
  "timestamp": "2026-11-23T20:00:00.000Z",
  "followers": ["alice", "charlie"],
  "following": ["alice", "bob"],
  "mutuals": ["alice"],
  "dontFollowBack": ["bob"],
  "notFollowedBack": ["charlie"],
  "stats": {
    "followersCount": 2,
    "followingCount": 2,
    "mutualsCount": 1,
    "dontFollowBackCount": 1,
    "notFollowedBackCount": 1,
    "reciprocityRate": 0.5000
  },
  "metadata": {
    "source": "content/followers.js",
    "followersTimestamp": "2026-11-23T20:00:00.000Z",
    "followingTimestamp": "2026-11-23T20:01:00.000Z"
  }
}
```

### Persistent Storage & Pruning Policy (`saveSnapshot`):
- Uses `chrome.storage.local` with keys `brutus_snapshots` and `brutus_latest_snapshot`.
- When a new snapshot is appended, the history array length is checked against `MAX_SNAPSHOTS = 10`.
- If `history.length > 10`, older snapshots are evicted from the head via `history.slice(-10)` (First-In, First-Out).
- This strictly bounds extension storage footprint well within Chrome quota limits.

---

## 7. Storage Fallback & Unit Testing

In non-browser environments (such as Node.js test runners where `chrome.storage.local` is undefined), `getStorageArea(customStorage)` provides automatic dependency injection:
- If a mock storage area with `.get()`, `.set()`, and `.remove()` is passed, it is used directly.
- If running inside a Chrome extension, it uses promisified wrappers around `chrome.storage.local`.
- Otherwise, it falls back to an in-memory `MemoryStorage` map.

This guarantees unit tests run fast and isolated without mocking global Chrome browser APIs.

---

## 8. Error Handling & Resilience

1. **Malicious or Malformed Messages:** Rejects `null`, non-object, and unhandled `type` strings with `{ success: false, error: "..." }`.
2. **Missing or Corrupt Data:** Rejects non-array follower/following payloads before any set operations run.
3. **Storage Errors:** All storage calls are wrapped in `try...catch` blocks; errors return `{ success: false, error: err.message }` without crashing the service worker process.
4. **No Uncaught Exceptions:** The service worker never throws uncaught exceptions during message handling.

---

## 9. Integration Checklist

| Module / Component | Owner | Integration Status | Notes |
|--------------------|-------|--------------------|-------|
| `manifest.json` | Prachi | Registered `serviceWorker.js` as ES module; registered `content/followers.js`. | Complete |
| `content/followers.js` | Kushagra | Sends `{ type: 'followersData', followers: [...] }`. Handled by `handleFollowersData`. | Fully compatible & tested |
| `content/following.js` | Kushagra | Sends `{ type: 'followingData', following: [...] }`. Handled by `handleFollowingData`. | Fully compatible & tested |
| `popup/popup.js` | Priyanshu | Requests `{ type: 'getLatestSnapshot' }` or `{ type: 'createSnapshot' }`. | Supported |
