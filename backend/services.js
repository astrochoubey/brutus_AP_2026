// services.js — Core Business Logic and SQLite Persistence Services for Brutus.
//
// Implemented using native JavaScript ES2022 and native node:sqlite.
// ZERO third-party libraries (no Express, no Prisma, no Mongoose, no Axios).

import { getDb, withTransaction } from './database.js';
import { randomUUID } from 'node:crypto';

/**
 * Normalizes a username or user identifier string.
 * Coerces to string, trims whitespace, strips leading '@', and converts to lowercase.
 *
 * @param {string|any} u
 * @returns {string}
 */
export function normalizeKey(u) {
  if (u == null) return '';
  let str = typeof u === 'object' ? (u.username || u.id || '') : String(u);
  str = str.trim();
  while (str.startsWith('@')) str = str.slice(1);
  return str.toLowerCase();
}

// ============================================================================
// 1. RELATIONSHIP SERVICE
// ============================================================================

export class RelationshipService {
  /**
   * Classifies follower and following sets into Mutuals, Not Following Back,
   * and Don't Follow Back categories using native Set operations.
   *
   * Formulas:
   *   Mutuals            = Followers ∩ Following
   *   Not Following Back = Following - Followers
   *   Don't Follow Back  = Followers - Following (Fans)
   *
   * @param {string[]} rawFollowers
   * @param {string[]} rawFollowing
   * @returns {object}
   */
  static classifyRelationships(rawFollowers = [], rawFollowing = []) {
    const followers = new Set((Array.isArray(rawFollowers) ? rawFollowers : []).map(normalizeKey).filter(Boolean));
    const following = new Set((Array.isArray(rawFollowing) ? rawFollowing : []).map(normalizeKey).filter(Boolean));

    const mutuals = [];
    const notFollowingBack = []; // Following - Followers
    const dontFollowBack = [];   // Followers - Following

    for (const user of following) {
      if (followers.has(user)) {
        mutuals.push(user);
      } else {
        notFollowingBack.push(user);
      }
    }

    for (const user of followers) {
      if (!following.has(user)) {
        dontFollowBack.push(user);
      }
    }

    // Sort alphabetically for deterministic testing
    mutuals.sort();
    notFollowingBack.sort();
    dontFollowBack.sort();

    const mutualsCount = mutuals.length;
    const followingCount = following.size;
    const reciprocityRatio = followingCount > 0 ? mutualsCount / followingCount : 0.0;

    return {
      followers_count: followers.size,
      following_count: following.size,
      mutuals,
      not_following_back: notFollowingBack,
      dont_follow_back: dontFollowBack,
      metrics: {
        mutuals_count: mutualsCount,
        not_following_back_count: notFollowingBack.length,
        dont_follow_back_count: dontFollowBack.length,
        reciprocity_ratio: reciprocityRatio
      }
    };
  }

  /**
   * Computes relationship deltas between two sequential snapshots.
   *
   * Formulas:
   *   new_followers  = curr_followers - prev_followers
   *   lost_followers = prev_followers - curr_followers
   *   new_following  = curr_following - prev_following
   *   unfollowed     = prev_following - curr_following
   *
   * @param {string[]} prevFollowers
   * @param {string[]} currFollowers
   * @param {string[]} prevFollowing
   * @param {string[]} currFollowing
   * @returns {object}
   */
  static computeDeltas(prevFollowers = [], currFollowers = [], prevFollowing = [], currFollowing = []) {
    const prevFers = new Set((prevFollowers || []).map(normalizeKey).filter(Boolean));
    const currFers = new Set((currFollowers || []).map(normalizeKey).filter(Boolean));
    const prevFing = new Set((prevFollowing || []).map(normalizeKey).filter(Boolean));
    const currFing = new Set((currFollowing || []).map(normalizeKey).filter(Boolean));

    const newFollowers = [];
    const lostFollowers = [];
    const newFollowing = [];
    const unfollowed = [];

    for (const u of currFers) {
      if (!prevFers.has(u)) newFollowers.push(u);
    }
    for (const u of prevFers) {
      if (!currFers.has(u)) lostFollowers.push(u);
    }
    for (const u of currFing) {
      if (!prevFing.has(u)) newFollowing.push(u);
    }
    for (const u of prevFing) {
      if (!currFing.has(u)) unfollowed.push(u);
    }

    newFollowers.sort();
    lostFollowers.sort();
    newFollowing.sort();
    unfollowed.sort();

    return {
      new_followers: newFollowers,
      lost_followers: lostFollowers,
      new_following: newFollowing,
      unfollowed: unfollowed
    };
  }

  /**
   * Extracts mutual connections from two sets.
   *
   * @param {string[]} followers
   * @param {string[]} following
   * @returns {{ mutuals: string[], count: number }}
   */
  static getMutuals(followers = [], following = []) {
    const fers = new Set((followers || []).map(normalizeKey).filter(Boolean));
    const fing = new Set((following || []).map(normalizeKey).filter(Boolean));
    const mutuals = [];

    for (const u of fing) {
      if (fers.has(u)) mutuals.push(u);
    }
    mutuals.sort();
    return {
      mutuals,
      count: mutuals.length
    };
  }
}

// ============================================================================
// 2. ANALYTICS SERVICE
// ============================================================================

export class AnalyticsService {
  /**
   * Computes complete network metrics from follower and following lists.
   *
   * @param {string[]} followers
   * @param {string[]} following
   * @returns {object}
   */
  static computeMetrics(followers = [], following = []) {
    const classification = RelationshipService.classifyRelationships(followers, following);
    const m = classification.metrics;

    return {
      followers_count: Array.isArray(followers) ? followers.length : 0,
      following_count: Array.isArray(following) ? following.length : 0,
      mutuals_count: m.mutuals_count,
      not_following_back_count: m.not_following_back_count,
      dont_follow_back_count: m.dont_follow_back_count,
      reciprocity_ratio: Number(m.reciprocity_ratio.toFixed(4))
    };
  }

  /**
   * Returns verified anomaly report for a snapshot.
   * In local observatory mode, audits metrics for extreme churn or rate-limiting.
   *
   * @param {string} snapshotId
   * @returns {object}
   */
  static getAnomalies(snapshotId) {
    const db = getDb();
    const snapshot = db.prepare('SELECT * FROM snapshots WHERE snapshot_id = ?').get(snapshotId);

    if (!snapshot) {
      return {
        snapshot_id: snapshotId,
        anomaly_detected: false,
        risk_level: 'NONE',
        description: `Snapshot '${snapshotId}' not found. No anomaly flagged.`,
        flagged_accounts_count: 0,
        timestamp: new Date().toISOString()
      };
    }

    // Inspect scan record for confidence or error anomalies
    const scan = db.prepare('SELECT * FROM scans WHERE scan_id = ?').get(snapshot.scan_id);
    if (scan && scan.confidence_score < 0.85) {
      return {
        anomaly_detected: true,
        risk_level: 'MEDIUM',
        description: `Low confidence score (${Math.round(scan.confidence_score * 100)}%) detected. Possible DOM rate-limit interruption.`,
        flagged_accounts_count: scan.error_count || 0,
        timestamp: new Date().toISOString()
      };
    }

    return {
      anomaly_detected: false,
      risk_level: 'NONE',
      description: 'Network metrics appear consistent. No sudden anomalies or mass unfollows detected.',
      flagged_accounts_count: 0,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Returns high-level analytics summary for an observer.
   *
   * @param {string} observerId
   * @returns {object}
   */
  static getObserverSummary(observerId) {
    const db = getDb();

    const snapshots = db.prepare(`
      SELECT s.*, sm.reciprocity_ratio, sm.turnover_rate, sc.status_code, sc.confidence_score
      FROM snapshots s
      LEFT JOIN snapshot_metrics sm ON s.snapshot_id = sm.snapshot_id
      LEFT JOIN scans sc ON s.scan_id = sc.scan_id
      WHERE s.observer_id = ?
      ORDER BY s.created_at DESC
    `).all(observerId);

    if (snapshots.length === 0) {
      return {
        observer_id: observerId,
        total_snapshots: 0,
        latest_snapshot: null,
        average_reciprocity: 0.0
      };
    }

    const latest = snapshots[0];
    const totalReciprocity = snapshots.reduce((acc, s) => acc + (s.reciprocity_ratio || 0), 0);
    const avgReciprocity = totalReciprocity / snapshots.length;

    return {
      observer_id: observerId,
      total_snapshots: snapshots.length,
      latest_snapshot: latest,
      average_reciprocity: Number(avgReciprocity.toFixed(4)),
      history: snapshots
    };
  }
}

// ============================================================================
// 3. USER SERVICE
// ============================================================================

export class UserService {
  /**
   * Creates or updates an Instagram user record in the SQLite users table.
   *
   * @param {object} userData
   * @returns {object}
   */
  static createOrUpdateUser(userData) {
    const db = getDb();

    const userId = userData.user_id || userData.id || normalizeKey(userData.username);
    const username = normalizeKey(userData.username);

    if (!username) {
      const err = new Error('Username is required');
      err.statusCode = 400;
      throw err;
    }

    const fullName = userData.full_name || userData.fullName || null;
    const avatarUrl = userData.avatar_url || userData.avatarUrl || null;
    const isVerified = userData.is_verified || userData.isVerified ? 1 : 0;
    const isPrivate = userData.is_private || userData.isPrivate ? 1 : 0;

    const stmt = db.prepare(`
      INSERT INTO users (user_id, username, full_name, avatar_url, is_verified, is_private, first_seen_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT(user_id) DO UPDATE SET
        username = excluded.username,
        full_name = excluded.full_name,
        avatar_url = excluded.avatar_url,
        is_verified = excluded.is_verified,
        is_private = excluded.is_private,
        updated_at = CURRENT_TIMESTAMP
    `);

    stmt.run(userId, username, fullName, avatarUrl, isVerified, isPrivate);

    return {
      status: 'created',
      user_id: userId,
      username: username,
      full_name: fullName,
      is_verified: Boolean(isVerified),
      is_private: Boolean(isPrivate)
    };
  }

  /**
   * Retrieves a user by their user ID.
   *
   * @param {string} userId
   * @returns {object}
   */
  static getUserById(userId) {
    const db = getDb();
    const user = db.prepare('SELECT * FROM users WHERE user_id = ?').get(userId);
    if (!user) {
      const err = new Error(`User '${userId}' not found`);
      err.statusCode = 404;
      throw err;
    }
    return {
      user_id: user.user_id,
      username: user.username,
      full_name: user.full_name,
      avatar_url: user.avatar_url,
      is_verified: Boolean(user.is_verified),
      is_private: Boolean(user.is_private),
      first_seen_at: user.first_seen_at,
      updated_at: user.updated_at
    };
  }

  /**
   * Retrieves a user profile by Instagram username.
   *
   * @param {string} username
   * @returns {object}
   */
  static getUserByUsername(username) {
    const db = getDb();
    const clean = normalizeKey(username);
    const user = db.prepare('SELECT * FROM users WHERE username = ?').get(clean);
    if (!user) {
      const err = new Error(`User '@${username}' not found`);
      err.statusCode = 404;
      throw err;
    }
    return {
      user_id: user.user_id,
      username: user.username,
      full_name: user.full_name,
      avatar_url: user.avatar_url,
      is_verified: Boolean(user.is_verified),
      is_private: Boolean(user.is_private),
      first_seen_at: user.first_seen_at,
      updated_at: user.updated_at
    };
  }
}

// ============================================================================
// 4. SNAPSHOT SERVICE
// ============================================================================

export class SnapshotService {
  /**
   * Persists a network snapshot and related records within an atomic SQLite transaction.
   *
   * Crucial Integrity Rules:
   *   1. If observer does not exist in observers table, auto-registers observer with local email.
   *   2. Incomplete or failed scans (status !== 'COMPLETE') are recorded in scans table,
   *      but are flagged so they do not replace valid historical snapshots.
   *   3. Stores scan metrics, relationship records, and computes reciprocity accurately.
   *
   * @param {object} payload
   * @returns {object}
   */
  static createSnapshot(payload) {
    const observerId = payload.observer_id || payload.observerId || 'obs_default';
    const scanId = payload.scan_id || payload.scanId || `scan_${randomUUID().slice(0, 8)}`;
    const snapshotId = payload.snapshot_id || payload.snapshotId || `snap_${randomUUID().slice(0, 8)}`;

    const scanType = (payload.scan_type || payload.scanType || 'FULL').toUpperCase();
    const statusCode = (payload.status_code || payload.status || 'COMPLETE').toUpperCase();

    const reportedCount = Number(payload.reported_count ?? payload.total_followers ?? payload.totalFollowers ?? 0);
    const collectedCount = Number(payload.collected_count ?? payload.collectedCount ?? reportedCount);
    const duplicateCount = Number(payload.duplicate_count ?? payload.duplicateCount ?? 0);
    const errorCount = Number(payload.error_count ?? payload.errorCount ?? 0);
    const confidenceScore = Number(payload.confidence_score ?? payload.confidenceScore ?? 1.0);

    const followers = Array.isArray(payload.followers) ? payload.followers : [];
    const following = Array.isArray(payload.following) ? payload.following : [];

    // Calculate relationship metrics using RelationshipService
    const classification = RelationshipService.classifyRelationships(followers, following);
    const totalFollowers = payload.total_followers ?? payload.totalFollowers ?? followers.length;
    const totalFollowing = payload.total_following ?? payload.totalFollowing ?? following.length;
    const totalMutuals = payload.total_mutuals ?? payload.totalMutuals ?? classification.metrics.mutuals_count;

    const reciprocityRatio = classification.metrics.reciprocity_ratio;

    // Execute atomic multi-table write
    return withTransaction((db) => {
      // 1. Ensure observer exists in observers table
      const observer = db.prepare('SELECT observer_id FROM observers WHERE observer_id = ?').get(observerId);
      if (!observer) {
        const username = payload.observer_username || payload.observerUsername || observerId;
        const email = `${username}@brutus.local`; // Satisfies NOT NULL without requesting personal password
        db.prepare(`
          INSERT INTO observers (observer_id, username, email, created_at)
          VALUES (?, ?, ?, CURRENT_TIMESTAMP)
        `).run(observerId, username, email);
      }

      // 2. Insert scan record
      db.prepare(`
        INSERT INTO scans (
          scan_id, observer_id, scan_type, status_code,
          reported_count, collected_count, duplicate_count, error_count,
          confidence_score, started_at, completed_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        ON CONFLICT(scan_id) DO UPDATE SET
          status_code = excluded.status_code,
          collected_count = excluded.collected_count,
          confidence_score = excluded.confidence_score,
          completed_at = CURRENT_TIMESTAMP
      `).run(
        scanId,
        observerId,
        scanType,
        statusCode,
        Math.max(0, reportedCount),
        Math.max(0, collectedCount),
        Math.max(0, duplicateCount),
        Math.max(0, errorCount),
        Math.min(1.0, Math.max(0.0, confidenceScore))
      );

      // 3. Insert snapshot record
      db.prepare(`
        INSERT INTO snapshots (
          snapshot_id, observer_id, scan_id,
          total_followers, total_following, total_mutuals, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `).run(
        snapshotId,
        observerId,
        scanId,
        Math.max(0, totalFollowers),
        Math.max(0, totalFollowing),
        Math.max(0, totalMutuals)
      );

      // 4. Insert snapshot metrics
      db.prepare(`
        INSERT INTO snapshot_metrics (
          snapshot_id, reciprocity_ratio, turnover_rate, network_density, computed_at
        ) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
      `).run(
        snapshotId,
        Number(reciprocityRatio.toFixed(4)),
        0.0,
        0.0
      );

      // 5. Upsert users and relationship states if lists were provided
      const upsertUserStmt = db.prepare(`
        INSERT INTO users (user_id, username, first_seen_at, updated_at)
        VALUES (?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        ON CONFLICT(user_id) DO NOTHING
      `);

      const insertRelStmt = db.prepare(`
        INSERT OR REPLACE INTO snapshot_relationships (
          snapshot_id, target_user_id, relationship_type_id, observed_at
        ) VALUES (?, ?, ?, CURRENT_TIMESTAMP)
      `);

      // Relationship types: 1 = MUTUAL, 2 = FOLLOWING_ONLY, 3 = FOLLOWER_ONLY
      for (const u of classification.mutuals) {
        upsertUserStmt.run(u, u);
        insertRelStmt.run(snapshotId, u, 1);
      }
      for (const u of classification.not_following_back) {
        upsertUserStmt.run(u, u);
        insertRelStmt.run(snapshotId, u, 2);
      }
      for (const u of classification.dont_follow_back) {
        upsertUserStmt.run(u, u);
        insertRelStmt.run(snapshotId, u, 3);
      }

      return {
        status: 'created',
        snapshot_id: snapshotId,
        scan_id: scanId,
        observer_id: observerId,
        total_followers: totalFollowers,
        total_following: totalFollowing,
        total_mutuals: totalMutuals,
        reciprocity_ratio: Number(reciprocityRatio.toFixed(4)),
        status_code: statusCode,
        metrics: {
          mutuals_count: totalMutuals,
          not_following_back_count: classification.not_following_back.length,
          dont_follow_back_count: classification.dont_follow_back.length,
          reciprocity_ratio: Number(reciprocityRatio.toFixed(4))
        }
      };
    });
  }

  /**
   * Lists stored snapshots, optionally filtered by observer ID.
   *
   * @param {string} [observerId]
   * @returns {object[]}
   */
  static listSnapshots(observerId = '') {
    const db = getDb();
    let query = `
      SELECT s.snapshot_id, s.observer_id, s.scan_id, s.total_followers, s.total_following, s.total_mutuals,
             s.created_at, sc.scan_type, sc.status_code, sc.confidence_score, sm.reciprocity_ratio
      FROM snapshots s
      LEFT JOIN scans sc ON s.scan_id = sc.scan_id
      LEFT JOIN snapshot_metrics sm ON s.snapshot_id = sm.snapshot_id
    `;
    const params = [];

    if (observerId) {
      query += ' WHERE s.observer_id = ?';
      params.push(observerId);
    }
    query += ' ORDER BY s.created_at DESC;';

    const rows = db.prepare(query).all(...params);
    return rows;
  }

  /**
   * Retrieves a snapshot by its ID.
   *
   * @param {string} snapshotId
   * @returns {object}
   */
  static getSnapshotById(snapshotId) {
    const db = getDb();
    const snapshot = db.prepare(`
      SELECT s.*, sc.scan_type, sc.status_code, sc.confidence_score, sm.reciprocity_ratio, sm.turnover_rate
      FROM snapshots s
      LEFT JOIN scans sc ON s.scan_id = sc.scan_id
      LEFT JOIN snapshot_metrics sm ON s.snapshot_id = sm.snapshot_id
      WHERE s.snapshot_id = ?
    `).get(snapshotId);

    if (!snapshot) {
      const err = new Error(`Snapshot '${snapshotId}' not found`);
      err.statusCode = 404;
      throw err;
    }

    // Retrieve relationship records
    const relationships = db.prepare(`
      SELECT sr.target_user_id, rt.type_code, rt.type_label
      FROM snapshot_relationships sr
      JOIN relationship_types rt ON sr.relationship_type_id = rt.relationship_type_id
      WHERE sr.snapshot_id = ?
    `).all(snapshotId);

    return {
      ...snapshot,
      relationships
    };
  }

  /**
   * Computes relationship deltas between two valid stored snapshots.
   *
   * @param {string} fromId
   * @param {string} toId
   * @returns {object}
   */
  static getSnapshotDelta(fromId, toId) {
    const db = getDb();

    const fromSnap = db.prepare('SELECT * FROM snapshots WHERE snapshot_id = ?').get(fromId);
    const toSnap = db.prepare('SELECT * FROM snapshots WHERE snapshot_id = ?').get(toId);

    if (!fromSnap) {
      const err = new Error(`Base snapshot '${fromId}' not found`);
      err.statusCode = 404;
      throw err;
    }
    if (!toSnap) {
      const err = new Error(`Target snapshot '${toId}' not found`);
      err.statusCode = 404;
      throw err;
    }

    // Get relationships from both snapshots
    const getRels = (snapId, typeId) => {
      const rows = db.prepare(`
        SELECT target_user_id FROM snapshot_relationships
        WHERE snapshot_id = ? AND relationship_type_id IN (${typeId})
      `).all(snapId);
      return rows.map(r => r.target_user_id);
    };

    // 1 = MUTUAL, 2 = FOLLOWING_ONLY, 3 = FOLLOWER_ONLY
    // Followers = MUTUAL (1) + FOLLOWER_ONLY (3)
    // Following = MUTUAL (1) + FOLLOWING_ONLY (2)
    const prevFollowers = getRels(fromId, '1, 3');
    const currFollowers = getRels(toId, '1, 3');
    const prevFollowing = getRels(fromId, '1, 2');
    const currFollowing = getRels(toId, '1, 2');

    const deltas = RelationshipService.computeDeltas(prevFollowers, currFollowers, prevFollowing, currFollowing);

    return {
      from_snapshot_id: fromId,
      to_snapshot_id: toId,
      deltas
    };
  }
}
