// controllers.js — Request controllers for Brutus API.
//
// Role:
//   Extracts inputs from HTTP requests (body, params, query), validates types,
//   invokes business logic services, and handles HTTP responses with proper status codes.

import {
  RelationshipService,
  AnalyticsService,
  UserService,
  SnapshotService
} from './services.js';
import { sendJson, sendError } from './middleware.js';

/**
 * Controller for relationship classification and delta calculations.
 */
export const RelationshipController = {
  /**
   * POST /api/v1/relationships/classify
   * Body: { followers: string[]|object[], following: string[]|object[] }
   */
  classify(req, res) {
    const { followers, following } = req.body || {};

    if (!Array.isArray(followers)) {
      return sendError(res, 400, "Missing or invalid 'followers' list. Must be an array.");
    }
    if (!Array.isArray(following)) {
      return sendError(res, 400, "Missing or invalid 'following' list. Must be an array.");
    }

    const result = RelationshipService.classifyRelationships(followers, following);
    return sendJson(res, 200, result);
  },

  /**
   * POST /api/v1/relationships/delta
   * Body: { prev_followers, curr_followers, prev_following, curr_following }
   */
  delta(req, res) {
    const body = req.body || {};
    const prevFollowers = body.prev_followers || body.prevFollowers || [];
    const currFollowers = body.curr_followers || body.currFollowers || [];
    const prevFollowing = body.prev_following || body.prevFollowing || [];
    const currFollowing = body.curr_following || body.currFollowing || [];

    if (!Array.isArray(prevFollowers) || !Array.isArray(currFollowers) ||
        !Array.isArray(prevFollowing) || !Array.isArray(currFollowing)) {
      return sendError(res, 400, "Invalid payload. All 4 lists (prev/curr followers & following) must be arrays.");
    }

    const result = RelationshipService.computeDeltas(
      prevFollowers,
      currFollowers,
      prevFollowing,
      currFollowing
    );

    return sendJson(res, 200, result);
  },

  /**
   * GET /api/v1/relationships/mutuals?followers=a,b&following=b,c
   */
  mutuals(req, res) {
    const followersParam = req.query.followers || '';
    const followingParam = req.query.following || '';

    const followers = followersParam.split(',').map(s => s.trim()).filter(Boolean);
    const following = followingParam.split(',').map(s => s.trim()).filter(Boolean);

    const result = RelationshipService.getMutuals(followers, following);

    return sendJson(res, 200, result);
  }
};

/**
 * Controller for network analytics, metrics, and anomaly inspection.
 */
export const AnalyticsController = {
  /**
   * POST /api/v1/analytics/metrics
   * Body: { followers: [...], following: [...] }
   */
  metrics(req, res) {
    const body = req.body || {};
    const followers = Array.isArray(body.followers) ? body.followers : [];
    const following = Array.isArray(body.following) ? body.following : [];

    const classification = RelationshipService.classifyRelationships(followers, following);
    const m = classification.metrics;

    return sendJson(res, 200, {
      followers_count: followers.length,
      following_count: following.length,
      mutuals_count: m.mutuals_count,
      not_following_back_count: m.not_following_back_count,
      dont_follow_back_count: m.dont_follow_back_count,
      reciprocity_ratio: m.reciprocity_ratio
    });
  },

  /**
   * GET /api/v1/analytics/anomalies/:id
   */
  anomalies(req, res) {
    const { id } = req.params;
    if (!id) {
      return sendError(res, 400, 'Snapshot ID is required.');
    }

    const result = AnalyticsService.getAnomalies(id);
    return sendJson(res, 200, result);
  },

  /**
   * GET /api/v1/analytics/summary/:observerId
   */
  summary(req, res) {
    const { observerId } = req.params;
    if (!observerId) {
      return sendError(res, 400, 'Observer ID is required.');
    }

    try {
      const result = AnalyticsService.getObserverSummary(observerId);
      return sendJson(res, 200, result);
    } catch (err) {
      return sendError(res, err.statusCode || 500, err.message);
    }
  }
};

/**
 * Controller for user profile ingestion and lookup.
 */
export const UserController = {
  /**
   * POST /api/v1/users
   * Body: { ig_user_id, username, full_name, is_private, is_verified, profile_pic_url }
   */
  create(req, res) {
    const body = req.body || {};
    if (!body.username && !body.user_id && !body.ig_user_id) {
      return sendError(res, 400, "Username or user_id is required to create/update a user profile.");
    }

    try {
      const user = UserService.createOrUpdateUser(body);
      return sendJson(res, 201, {
        status: 'accepted',
        user
      });
    } catch (err) {
      return sendError(res, err.statusCode || 500, err.message);
    }
  },

  /**
   * GET /api/v1/users/:id
   */
  getById(req, res) {
    const { id } = req.params;
    try {
      const user = UserService.getUserById(id);
      if (!user) {
        return sendError(res, 404, `User with ID '${id}' not found.`);
      }
      return sendJson(res, 200, user);
    } catch (err) {
      return sendError(res, err.statusCode || 500, err.message);
    }
  },

  /**
   * GET /api/v1/users/by-username/:username
   */
  getByUsername(req, res) {
    const { username } = req.params;
    try {
      const user = UserService.getUserByUsername(username);
      if (!user) {
        return sendError(res, 404, `User '@${username}' not found.`);
      }
      return sendJson(res, 200, user);
    } catch (err) {
      return sendError(res, err.statusCode || 500, err.message);
    }
  }
};

/**
 * Controller for scan snapshots and historical network analysis.
 */
export const SnapshotController = {
  /**
   * POST /api/v1/snapshots
   */
  create(req, res) {
    const body = req.body || {};
    try {
      const result = SnapshotService.createSnapshot(body);
      return sendJson(res, 201, {
        status: 'created',
        ...result
      });
    } catch (err) {
      return sendError(res, err.statusCode || 400, err.message);
    }
  },

  /**
   * GET /api/v1/snapshots
   */
  list(req, res) {
    const observerId = req.query.observer_id || null;
    const limit = Number(req.query.limit) || 20;

    try {
      const snapshots = SnapshotService.listSnapshots(observerId, limit);
      return sendJson(res, 200, {
        snapshots,
        count: snapshots.length
      });
    } catch (err) {
      return sendError(res, err.statusCode || 500, err.message);
    }
  },

  /**
   * GET /api/v1/snapshots/:id
   */
  getById(req, res) {
    const { id } = req.params;
    try {
      const snapshot = SnapshotService.getSnapshotById(id);
      if (!snapshot) {
        return sendError(res, 404, `Snapshot '${id}' not found.`);
      }
      return sendJson(res, 200, snapshot);
    } catch (err) {
      return sendError(res, err.statusCode || 500, err.message);
    }
  },

  /**
   * GET /api/v1/snapshots/:fromId/delta/:toId
   */
  delta(req, res) {
    const { fromId, toId } = req.params;
    try {
      const result = SnapshotService.getSnapshotDelta(fromId, toId);
      return sendJson(res, 200, result);
    } catch (err) {
      return sendError(res, err.statusCode || 500, err.message);
    }
  }
};
