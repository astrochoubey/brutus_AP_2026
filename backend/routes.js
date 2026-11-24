// routes.js — Native URL router for the Brutus Node.js backend.
//
// Features:
//   1. Zero external routing libraries (no Express router).
//   2. Parses request pathname and search query parameters using native `new URL()`.
//   3. Supports parameterized path matching with regex (e.g., :id, :username, :fromId/delta/:toId).
//   4. Order-independent exact match checks, with parameter routes ordered specifically
//      (e.g., /by-username/:username before /:id).

import {
  RelationshipController,
  AnalyticsController,
  UserController,
  SnapshotController
} from './controllers.js';
import { sendJson, sendError } from './middleware.js';

/**
 * Route definition list.
 * Each entry defines:
 *   - method: 'GET' | 'POST' | 'PUT' | 'DELETE'
 *   - pattern: RegExp to match against pathname
 *   - paramNames: array of extracted parameter keys
 *   - handler: controller function (req, res) => Promise<void> | void
 */
const routes = [
  // 1. Root and Health Checks
  {
    method: 'GET',
    pattern: /^\/$/,
    paramNames: [],
    handler: (req, res) => sendJson(res, 200, {
      message: 'Brutus Instagram Network Observatory API',
      status: 'active',
      version: '1.0.0',
      runtime: `Node.js ${process.version}`
    })
  },
  {
    method: 'GET',
    pattern: /^\/health$/,
    paramNames: [],
    handler: (req, res) => sendJson(res, 200, {
      status: 'ok',
      service: 'brutus-api',
      timestamp: new Date().toISOString()
    })
  },

  // 2. Relationships Endpoints
  // Supports both /api/v1/relationships/* and /relationships/*
  {
    method: 'POST',
    pattern: /^(?:\/api\/v1)?\/relationships\/classify$/,
    paramNames: [],
    handler: RelationshipController.classify
  },
  {
    method: 'POST',
    pattern: /^(?:\/api\/v1)?\/relationships\/delta$/,
    paramNames: [],
    handler: RelationshipController.delta
  },
  {
    method: 'GET',
    pattern: /^(?:\/api\/v1)?\/relationships\/mutuals$/,
    paramNames: [],
    handler: RelationshipController.mutuals
  },

  // 3. Analytics Endpoints
  {
    method: 'POST',
    pattern: /^(?:\/api\/v1)?\/analytics\/metrics$/,
    paramNames: [],
    handler: AnalyticsController.metrics
  },
  {
    method: 'GET',
    pattern: /^(?:\/api\/v1)?\/analytics\/anomalies\/([^/]+)$/,
    paramNames: ['id'],
    handler: AnalyticsController.anomalies
  },
  {
    method: 'GET',
    pattern: /^(?:\/api\/v1)?\/analytics\/summary\/([^/]+)$/,
    paramNames: ['observerId'],
    handler: AnalyticsController.summary
  },

  // 4. Users Endpoints
  {
    method: 'POST',
    pattern: /^(?:\/api\/v1)?\/users$/,
    paramNames: [],
    handler: UserController.create
  },
  // IMPORTANT: /by-username/:username MUST precede /:id so "by-username" is not captured as an ID!
  {
    method: 'GET',
    pattern: /^(?:\/api\/v1)?\/users\/by-username\/([^/]+)$/,
    paramNames: ['username'],
    handler: UserController.getByUsername
  },
  {
    method: 'GET',
    pattern: /^(?:\/api\/v1)?\/users\/([^/]+)$/,
    paramNames: ['id'],
    handler: UserController.getById
  },

  // 5. Snapshots Endpoints
  {
    method: 'POST',
    pattern: /^(?:\/api\/v1)?\/snapshots$/,
    paramNames: [],
    handler: SnapshotController.create
  },
  {
    method: 'GET',
    pattern: /^(?:\/api\/v1)?\/snapshots$/,
    paramNames: [],
    handler: SnapshotController.list
  },
  // IMPORTANT: /:fromId/delta/:toId MUST precede /:id so "/delta/" is not matched as an ID
  {
    method: 'GET',
    pattern: /^(?:\/api\/v1)?\/snapshots\/([^/]+)\/delta\/([^/]+)$/,
    paramNames: ['fromId', 'toId'],
    handler: SnapshotController.delta
  },
  {
    method: 'GET',
    pattern: /^(?:\/api\/v1)?\/snapshots\/([^/]+)$/,
    paramNames: ['id'],
    handler: SnapshotController.getById
  }
];

/**
 * Main route dispatcher called by server.js.
 * Matches incoming HTTP method and pathname, parses parameters, and invokes controller.
 *
 * @param {import('node:http').IncomingMessage} req
 * @param {import('node:http').ServerResponse} res
 */
export async function handleRoute(req, res) {
  // Parse full URL using host header or fallback to localhost
  const host = req.headers.host || 'localhost';
  const parsedUrl = new URL(req.url, `http://${host}`);
  
  // Normalize pathname: remove trailing slash unless it's just "/"
  let pathname = parsedUrl.pathname;
  if (pathname.length > 1 && pathname.endsWith('/')) {
    pathname = pathname.slice(0, -1);
  }

  // Attach convenient query object to request
  req.path = pathname;
  req.query = Object.fromEntries(parsedUrl.searchParams.entries());
  req.params = {};

  const reqMethod = req.method.toUpperCase();

  // Find matching route definition
  for (const route of routes) {
    if (route.method !== reqMethod) {
      continue;
    }

    const match = pathname.match(route.pattern);
    if (match) {
      // Extract capture groups into req.params
      // match[0] is the whole matched string, match[1..n] are capture groups
      route.paramNames.forEach((name, index) => {
        req.params[name] = decodeURIComponent(match[index + 1]);
      });

      return await route.handler(req, res);
    }
  }

  // If no route matched, send clean 404 response
  return sendError(res, 404, `Cannot ${reqMethod} ${pathname} — Route not found.`);
}
