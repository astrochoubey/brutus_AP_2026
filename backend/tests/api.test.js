// tests/api.test.js — Native Node.js test suite for Brutus API.
//
// Built entirely using Node's native test runner (node:test) and assertion library (node:assert).
// Zero third-party testing dependencies (no Jest, Mocha, or Chai).

import test, { describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { initDatabase, closeDatabase } from '../database.js';
import { loggerMiddleware, corsMiddleware, parseJsonBody, sendError } from '../middleware.js';
import { handleRoute } from '../routes.js';

let testServer;
let baseUrl;

// Helper to make native fetch requests to test server
async function apiRequest(path, options = {}) {
  const url = `${baseUrl}${path}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });

  const contentType = response.headers.get('content-type') || '';
  let body = null;
  if (contentType.includes('application/json')) {
    body = await response.json();
  } else {
    body = await response.text();
  }

  return { status: response.status, headers: response.headers, body };
}

describe('Brutus Node.js API Native Test Suite', () => {
  before(async () => {
    // 1. Initialize SQLite Database
    initDatabase();

    // 2. Spin up test server on dynamic port (port 0 selects an available free port)
    testServer = createServer(async (req, res) => {
      loggerMiddleware(req);
      if (corsMiddleware(req, res)) return;

      try {
        req.body = await parseJsonBody(req);
      } catch (err) {
        return sendError(res, err.statusCode || 400, err.message);
      }

      try {
        await handleRoute(req, res);
      } catch (err) {
        sendError(res, 500, err.message);
      }
    });

    await new Promise((resolve) => {
      testServer.listen(0, '127.0.0.1', () => {
        const address = testServer.address();
        baseUrl = `http://127.0.0.1:${address.port}`;
        resolve();
      });
    });
  });

  after(async () => {
    await new Promise((resolve) => testServer.close(resolve));
    closeDatabase();
  });

  // --- 1. Health & Root Endpoints ---
  test('GET /health returns 200 ok and service name', async () => {
    const res = await apiRequest('/health');
    assert.equal(res.status, 200);
    assert.equal(res.body.status, 'ok');
    assert.equal(res.body.service, 'brutus-api');
    assert.ok(res.body.timestamp);
  });

  test('GET / returns API metadata and Node version', async () => {
    const res = await apiRequest('/');
    assert.equal(res.status, 200);
    assert.equal(res.body.status, 'active');
    assert.ok(res.body.runtime.includes('Node.js'));
  });

  // --- 2. Relationship Classification & Delta ---
  test('POST /api/v1/relationships/classify computes mutuals and non-reciprocated sets', async () => {
    const payload = {
      followers: ['alice', 'bob', 'carol'],
      following: ['bob', 'carol', 'dave', 'eve']
    };

    const res = await apiRequest('/api/v1/relationships/classify', {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.followers_count, 3);
    assert.equal(res.body.following_count, 4);

    // Mutuals should be bob and carol
    assert.equal(res.body.metrics.mutuals_count, 2);
    assert.ok(res.body.mutuals.includes('bob'));
    assert.ok(res.body.mutuals.includes('carol'));

    // Not following back (I follow them, they don't follow me): dave, eve
    assert.equal(res.body.metrics.not_following_back_count, 2);
    assert.ok(res.body.not_following_back.includes('dave'));
    assert.ok(res.body.not_following_back.includes('eve'));

    // Don't follow back (They follow me, I don't follow them): alice
    assert.equal(res.body.metrics.dont_follow_back_count, 1);
    assert.ok(res.body.dont_follow_back.includes('alice'));

    // Reciprocity ratio: 2 / 4 = 0.5
    assert.equal(res.body.metrics.reciprocity_ratio, 0.5);
  });

  test('POST /api/v1/relationships/delta calculates follower/following changes', async () => {
    const payload = {
      prev_followers: ['userA', 'userB'],
      curr_followers: ['userB', 'userC'],
      prev_following: ['userD'],
      curr_following: ['userD', 'userE']
    };

    const res = await apiRequest('/api/v1/relationships/delta', {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    assert.equal(res.status, 200);
    // Usernames are normalized to lowercase
    assert.deepEqual(res.body.new_followers, ['userc']);
    assert.deepEqual(res.body.lost_followers, ['usera']);
    assert.deepEqual(res.body.new_following, ['usere']);
    assert.deepEqual(res.body.unfollowed, []);
  });

  test('GET /api/v1/relationships/mutuals returns intersection of query params', async () => {
    const res = await apiRequest('/api/v1/relationships/mutuals?followers=a,b,c&following=b,c,d');
    assert.equal(res.status, 200);
    assert.equal(res.body.count, 2);
    assert.ok(res.body.mutuals.includes('b'));
    assert.ok(res.body.mutuals.includes('c'));
  });

  // --- 3. Analytics Endpoints ---
  test('POST /api/v1/analytics/metrics computes summary counts without database', async () => {
    const payload = {
      followers: ['m1', 'm2'],
      following: ['m2', 'm3']
    };

    const res = await apiRequest('/api/v1/analytics/metrics', {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.followers_count, 2);
    assert.equal(res.body.following_count, 2);
    assert.equal(res.body.mutuals_count, 1);
    assert.equal(res.body.not_following_back_count, 1);
    assert.equal(res.body.dont_follow_back_count, 1);
    assert.equal(res.body.reciprocity_ratio, 0.5);
  });

  test('GET /api/v1/analytics/anomalies/:id returns clean safe structure', async () => {
    const res = await apiRequest('/api/v1/analytics/anomalies/snap_123');
    assert.equal(res.status, 200);
    assert.equal(res.body.snapshot_id, 'snap_123');
    assert.equal(typeof res.body.anomaly_detected, 'boolean');
  });

  // --- 4. User Profiles & Database Persistence ---
  test('POST /api/v1/users creates or updates user profile in SQLite', async () => {
    const payload = {
      username: 'test_student',
      full_name: 'Test Student',
      is_verified: true,
      is_private: false
    };

    const res = await apiRequest('/api/v1/users', {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    assert.equal(res.status, 201);
    assert.equal(res.body.status, 'accepted');
    assert.equal(res.body.user.username, 'test_student');
    assert.ok(res.body.user.user_id);
  });

  test('GET /api/v1/users/by-username/:username retrieves created user', async () => {
    const res = await apiRequest('/api/v1/users/by-username/test_student');
    assert.equal(res.status, 200);
    assert.equal(res.body.username, 'test_student');
    assert.equal(res.body.full_name, 'Test Student');
  });

  // --- 5. Snapshots Endpoints ---
  test('POST /api/v1/snapshots persists scan and relationship records in transaction', async () => {
    const payload = {
      observer_username: 'observer_tester',
      followers: ['fan1', 'fan2', 'mutual_friend'],
      following: ['star1', 'mutual_friend'],
      status: 'COMPLETE'
    };

    const res = await apiRequest('/api/v1/snapshots', {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    assert.equal(res.status, 201);
    assert.equal(res.body.status, 'created');
    assert.ok(res.body.snapshot_id);
    assert.equal(res.body.total_followers, 3);
    assert.equal(res.body.total_following, 2);
    assert.equal(res.body.metrics.mutuals_count, 1);

    // Retrieve by snapshot_id
    const snapId = res.body.snapshot_id;
    const fetchRes = await apiRequest(`/api/v1/snapshots/${snapId}`);
    assert.equal(fetchRes.status, 200);
    assert.equal(fetchRes.body.snapshot_id, snapId);
    assert.equal(fetchRes.body.total_followers, 3);
  });

  // --- 6. Error Handling ---
  test('POST with malformed JSON returns 400 Bad Request', async () => {
    const res = await apiRequest('/api/v1/relationships/classify', {
      method: 'POST',
      body: '{ not valid json'
    });
    assert.equal(res.status, 400);
    assert.ok(res.body.error);
  });

  test('GET unknown route returns 404 Not Found', async () => {
    const res = await apiRequest('/api/v1/nonexistent/endpoint');
    assert.equal(res.status, 404);
    assert.ok(res.body.error.includes('Route not found'));
  });

  test('OPTIONS preflight request returns 204 with CORS headers', async () => {
    const extOrigin = 'chrome-extension://dminabjakehjlefekjcmojjfhooplfpj';
    const res = await apiRequest('/api/v1/relationships/classify', {
      method: 'OPTIONS',
      headers: {
        'Origin': extOrigin
      }
    });
    assert.equal(res.status, 204);
    assert.equal(res.headers.get('access-control-allow-origin'), extOrigin);
    assert.ok(res.headers.get('access-control-allow-methods'));
  });
});
