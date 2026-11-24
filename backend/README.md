# Brutus Backend — Instagram Network Observatory

High-performance, dependency-free Node.js backend and SQLite persistence service for the Brutus Instagram Network Observatory.

> **Status:** Fully Functional & Tested (Node.js ES2022 + SQLite).  
> **Legacy Fallback:** Python FastAPI implementation preserved under `backend/app/`.

---

## 1. Architecture & Design Principles

### Zero Third-Party Dependencies
This backend is built **strictly using Node.js built-in modules**:
- `node:http` — HTTP server request handling, headers, chunked streaming, and CORS preflight.
- `node:sqlite` (`DatabaseSync`) — Direct, synchronous SQLite database queries and atomic transactions without external ORMs or drivers.
- `node:fs` & `node:path` — File system access for schema loading and database file resolution.
- `node:crypto` — Native UUID generation (`randomUUID`) for scan and snapshot identification.
- `node:test` & `node:assert/strict` — Native test runner with zero testing framework overhead.

No Express, no Prisma, no Mongoose, no Sequelize, no Axios, no cors package, and no dotenv.

---

## 2. Directory Layout

```text
backend/
├── server.js              # Native HTTP server entry point & shutdown handler
├── routes.js              # Native regex & pathname URL routing table
├── controllers.js         # Request validation & HTTP status responses
├── services.js            # Set-theory relationship & analytics logic
├── middleware.js          # CORS, request logging, JSON body stream parser
├── database.js            # Native node:sqlite initialization & transactions
├── package.json           # ES Modules configuration and test runner script
├── tests/
│   └── api.test.js        # Comprehensive native test suite (13 passing tests)
├── database/
│   └── brutus.sqlite      # Persistent SQLite database file
├── README.md              # Documentation and viva preparation guide
└── app/                   # Legacy Python FastAPI implementation (archived fallback)
```

---

## 3. Quick Start

### Prerequisites
- Node.js v22.5.0+ (Tested on Node.js v24.19.0 with native `node:sqlite`).

### Running the Server
```bash
# From the repository root or backend/ directory:
cd backend

# Start on default port (PORT=3000):
npm start

# Or specify a custom port (e.g. 8000):
PORT=8000 npm start
```

### Running Native Tests
```bash
npm test
```
*Executes all 13 native test cases using `node:test` with sub-150ms total execution time.*

---

## 4. API Reference

All endpoints support both `/api/v1/...` and direct paths (e.g. `/relationships/classify`).

### System & Health
- **`GET /health`**  
  Returns server health status.  
  *Response:* `{"status": "ok", "service": "brutus-api", "timestamp": "2026-11-24T..."}`

- **`GET /`**  
  Returns API service metadata and current Node.js runtime version.

### Relationships
- **`POST /api/v1/relationships/classify`**  
  Computes mutuals, not-following-back, and don't-follow-back sets using Set operations.  
  *Payload:*
  ```json
  {
    "followers": ["alice", "bob", "carol"],
    "following": ["bob", "carol", "dave"]
  }
  ```
  *Response:*
  ```json
  {
    "followers_count": 3,
    "following_count": 3,
    "mutuals": ["bob", "carol"],
    "not_following_back": ["dave"],
    "dont_follow_back": ["alice"],
    "metrics": {
      "mutuals_count": 2,
      "not_following_back_count": 1,
      "dont_follow_back_count": 1,
      "reciprocity_ratio": 0.6667
    }
  }
  ```

- **`POST /api/v1/relationships/delta`**  
  Computes changes between two sequential scan states.  
  *Payload:*
  ```json
  {
    "prev_followers": ["a", "b"],
    "curr_followers": ["b", "c"],
    "prev_following": ["d"],
    "curr_following": ["d", "e"]
  }
  ```
  *Response:*
  ```json
  {
    "new_followers": ["c"],
    "lost_followers": ["a"],
    "new_following": ["e"],
    "unfollowed": []
  }
  ```

- **`GET /api/v1/relationships/mutuals?followers=a,b,c&following=b,c,d`**  
  Returns array of mutual usernames and count.

### Analytics & Metrics
- **`POST /api/v1/analytics/metrics`**  
  Direct calculation of network metrics without requiring database writes.

- **`GET /api/v1/analytics/anomalies/:snapshotId`**  
  Audits snapshot metrics for abnormal relationship churn or rate-limiting anomalies.

- **`GET /api/v1/analytics/summary/:observerId`**  
  Returns historical analytics and trend summary for an observer.

### Users
- **`POST /api/v1/users`**  
  Registers or updates an Instagram user record.
- **`GET /api/v1/users/:id`**  
  Retrieves a user by ID.
- **`GET /api/v1/users/by-username/:username`**  
  Retrieves a user by handle (case-insensitive).

### Snapshots & Historical Scans
- **`POST /api/v1/snapshots`**  
  Persists a complete or partial scan snapshot into SQLite with atomic transaction integrity.
- **`GET /api/v1/snapshots`**  
  Lists all stored snapshots (supports `?observer_id=` and `?limit=` query params).
- **`GET /api/v1/snapshots/:id`**  
  Retrieves snapshot details and relationship breakdowns.
- **`GET /api/v1/snapshots/:fromId/delta/:toId`**  
  Computes historical delta directly between two stored snapshots in the database.

---

## 5. College Viva & Technical Explanation

### 1. Why use native `node:http` instead of Express?
In modern Node.js, `node:http` provides the foundational request/response streams. By building the routing and middleware mechanisms natively:
1. Zero third-party supply chain vulnerabilities or package bloat.
2. Complete transparency over HTTP headers, chunked streaming (`req.on('data')`, `req.on('end')`), and CORS preflight handling.
3. Every single line of code can be explained from first principles without framework magic.

### 2. How does `node:sqlite` work?
Introduced natively in Node.js, `DatabaseSync` executes SQLite queries synchronously on the local disk. It provides prepared statements (`db.prepare(...)`) with parameter binding (`?`) which completely protects against SQL injection attacks without requiring a 30MB ORM like Prisma.

### 3. How does Set Theory power relationship classification?
- Let $A$ be the set of followers.
- Let $B$ be the set of following accounts.
- **Mutuals** = $A \cap B$ (Intersection)
- **Not Following Back** = $B \setminus A$ (Difference: accounts you follow who do not follow you back)
- **Don't Follow Back** = $A \setminus B$ (Difference: fans who follow you but you do not follow back)
- **Reciprocity Ratio** = $\frac{|A \cap B|}{|B|}$
By leveraging JavaScript `Set` structures, lookups run in $O(1)$ amortized time, leading to overall $O(N + M)$ algorithmic complexity.
