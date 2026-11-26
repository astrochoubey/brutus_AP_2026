-- ============================================================================
-- dbms/04_queries.sql — Analytical and Operational Queries for Brutus
-- Instagram Network Observatory (Checkpoint 3 / CP3)
--
-- Formalized Relational Queries for PostgreSQL and SQLite
-- Schema Baseline: dbms/03_schema.sql & database/schema.sql
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Snapshot Mutual Connections Query
-- Retrieves all mutual connections for a given snapshot, joining users and
-- relationship types, ordered alphabetically by username.
-- ----------------------------------------------------------------------------
-- Description:
--   Returns target accounts who both follow and are followed by the observer
--   at the point in time recorded by the snapshot.
-- Parameters:
--   :snapshot_id = 'snap_bench_a'
-- ----------------------------------------------------------------------------
SELECT 
    u.user_id,
    u.username,
    u.full_name,
    u.avatar_url,
    u.is_verified,
    rt.type_code,
    rt.type_label,
    sr.observed_at
FROM snapshot_relationships sr
JOIN users u ON sr.target_user_id = u.user_id
JOIN relationship_types rt ON sr.relationship_type_id = rt.relationship_type_id
WHERE sr.snapshot_id = 'snap_bench_a'
  AND rt.type_code = 'MUTUAL'
ORDER BY u.username ASC;


-- ----------------------------------------------------------------------------
-- 2. Non-Reciprocal Following (Not Following Back) Query
-- Identifies accounts the observer follows who do not follow the observer back.
-- ----------------------------------------------------------------------------
-- Description:
--   Isolates asymmetric outgoing relationships (Following Only).
-- Parameters:
--   :snapshot_id = 'snap_bench_a'
-- ----------------------------------------------------------------------------
SELECT 
    u.user_id,
    u.username,
    u.full_name,
    u.avatar_url,
    u.is_verified,
    u.is_private,
    sr.observed_at
FROM snapshot_relationships sr
JOIN users u ON sr.target_user_id = u.user_id
JOIN relationship_types rt ON sr.relationship_type_id = rt.relationship_type_id
WHERE sr.snapshot_id = 'snap_bench_a'
  AND rt.type_code = 'FOLLOWING_ONLY'
ORDER BY u.username ASC;


-- ----------------------------------------------------------------------------
-- 3. Fan Followers (Follower Only / Don't Follow Back) Query
-- Identifies accounts that follow the observer, but the observer does not follow back.
-- ----------------------------------------------------------------------------
-- Description:
--   Isolates asymmetric incoming relationships (Followers Only / Fans).
-- Parameters:
--   :snapshot_id = 'snap_bench_a'
-- ----------------------------------------------------------------------------
SELECT 
    u.user_id,
    u.username,
    u.full_name,
    u.avatar_url,
    u.is_verified,
    sr.observed_at
FROM snapshot_relationships sr
JOIN users u ON sr.target_user_id = u.user_id
JOIN relationship_types rt ON sr.relationship_type_id = rt.relationship_type_id
WHERE sr.snapshot_id = 'snap_bench_a'
  AND rt.type_code = 'FOLLOWER_ONLY'
ORDER BY u.username ASC;


-- ----------------------------------------------------------------------------
-- 4. Sequential Snapshot Differencing & Churn Audit Query
-- Retrieves exact relationship transitions between two sequential snapshots.
-- ----------------------------------------------------------------------------
-- Description:
--   Uses relationship_deltas to track who unfollowed, who followed, and who
--   became or broke mutual status between snapshot A and snapshot B.
-- Parameters:
--   :from_snapshot_id = 'snap_bench_a'
--   :to_snapshot_id   = 'snap_bench_b'
-- ----------------------------------------------------------------------------
SELECT 
    rd.delta_id,
    rd.from_snapshot_id,
    rd.to_snapshot_id,
    u.username,
    u.full_name,
    ct.type_code AS change_type,
    ct.description AS change_description,
    ct.is_churn,
    rd.detected_at
FROM relationship_deltas rd
JOIN change_types ct ON rd.change_type_id = ct.change_type_id
JOIN users u ON rd.target_user_id = u.user_id
WHERE rd.from_snapshot_id = 'snap_bench_a'
  AND rd.to_snapshot_id = 'snap_bench_b'
ORDER BY rd.detected_at DESC, u.username ASC;


-- ----------------------------------------------------------------------------
-- 5. Network Growth & Macro-Metrics Time-Series Query
-- Retrieves chronological snapshot metrics for dashboard trend visualization.
-- ----------------------------------------------------------------------------
-- Description:
--   Aggregates total followers, following, mutuals, reciprocity ratio,
--   and network density across all historical snapshots for an observer.
-- Parameters:
--   :observer_id = 'obs_default'
-- ----------------------------------------------------------------------------
SELECT 
    s.snapshot_id,
    s.scan_id,
    s.total_followers,
    s.total_following,
    s.total_mutuals,
    ROUND(sm.reciprocity_ratio, 4) AS reciprocity_ratio,
    ROUND(sm.turnover_rate, 4) AS turnover_rate,
    ROUND(sm.network_density, 4) AS network_density,
    s.created_at AS snapshot_timestamp
FROM snapshots s
JOIN snapshot_metrics sm ON s.snapshot_id = sm.snapshot_id
WHERE s.observer_id = 'obs_default'
ORDER BY s.created_at ASC;


-- ----------------------------------------------------------------------------
-- 6. Crawler Scan Audit & Data Quality Telemetry Query
-- Evaluates DOM scanner reliability, confidence scores, and error rates.
-- ----------------------------------------------------------------------------
-- Description:
--   Verifies data collection integrity, confidence score calculations,
--   reported vs collected count differences, and status validity.
-- Parameters:
--   :observer_id = 'obs_default'
-- ----------------------------------------------------------------------------
SELECT 
    sc.scan_id,
    sc.scan_type,
    ss.status_label,
    ss.is_valid_for_analysis,
    sc.reported_count,
    sc.collected_count,
    (sc.reported_count - sc.collected_count) AS missing_count,
    sc.duplicate_count,
    sc.error_count,
    ROUND(sc.confidence_score, 2) AS confidence_score,
    sc.started_at,
    sc.completed_at
FROM scans sc
JOIN scan_statuses ss ON sc.status_code = ss.status_code
WHERE sc.observer_id = 'obs_default'
ORDER BY sc.started_at DESC;


-- ----------------------------------------------------------------------------
-- 7. High-Churn User Impact Analysis (Top Churners Leaderboard)
-- Groups user accounts by frequency of negative churn events.
-- ----------------------------------------------------------------------------
-- Description:
--   Finds volatile Instagram accounts that repeatedly follow/unfollow the observer.
-- ----------------------------------------------------------------------------
SELECT 
    u.user_id,
    u.username,
    u.full_name,
    COUNT(rd.delta_id) AS total_events,
    SUM(CASE WHEN ct.type_code = 'LOST_FOLLOWER' THEN 1 ELSE 0 END) AS times_lost_follower,
    SUM(CASE WHEN ct.type_code = 'UNFOLLOWED' THEN 1 ELSE 0 END) AS times_unfollowed_by_observer,
    SUM(CASE WHEN ct.is_churn = 1 THEN 1 ELSE 0 END) AS total_churn_score
FROM relationship_deltas rd
JOIN users u ON rd.target_user_id = u.user_id
JOIN change_types ct ON rd.change_type_id = ct.change_type_id
GROUP BY u.user_id, u.username, u.full_name
ORDER BY total_churn_score DESC, total_events DESC;


-- ----------------------------------------------------------------------------
-- 8. Runtime Set Differencing (Live Delta Verification)
-- Computes new users present in Snapshot B who were NOT present in Snapshot A
-- dynamically using set-difference subquery (verifies stored deltas).
-- ----------------------------------------------------------------------------
-- Description:
--   Demonstrates relational set-difference equivalence (B \ A) without relying
--   on the materialized relationship_deltas table.
-- Parameters:
--   :from_snapshot_id = 'snap_bench_a'
--   :to_snapshot_id   = 'snap_bench_b'
-- ----------------------------------------------------------------------------
SELECT 
    curr_u.user_id,
    curr_u.username,
    curr_u.full_name,
    rt.type_code AS current_relationship
FROM snapshot_relationships curr_sr
JOIN users curr_u ON curr_sr.target_user_id = curr_u.user_id
JOIN relationship_types rt ON curr_sr.relationship_type_id = rt.relationship_type_id
WHERE curr_sr.snapshot_id = 'snap_bench_b'
  AND curr_sr.target_user_id NOT IN (
      SELECT prev_sr.target_user_id
      FROM snapshot_relationships prev_sr
      WHERE prev_sr.snapshot_id = 'snap_bench_a'
  )
ORDER BY curr_u.username ASC;
