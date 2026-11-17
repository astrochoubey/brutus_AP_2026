INSERT OR IGNORE INTO scan_statuses (status_code, status_label, description, is_valid_for_analysis) VALUES
    ('COMPLETE', 'Scan Complete', 'Data extraction matches Instagram reported counter', 1),
    ('PARTIAL', 'Partial Scan', 'Scan interrupted or missing pagination records', 0),
    ('FAILED', 'Scan Failed', 'Extraction aborted due to rate limits or network error', 0);

INSERT OR IGNORE INTO relationship_types (relationship_type_id, type_code, type_label, follows_observer, followed_by_observer, is_mutual) VALUES
    (1, 'MUTUAL', 'Mutual Connection', 1, 1, 1),
    (2, 'FOLLOWING_ONLY', 'Following Only (Non-Follower)', 0, 1, 0),
    (3, 'FOLLOWER_ONLY', 'Follower Only (Fan)', 1, 0, 0);

INSERT OR IGNORE INTO change_types (change_type_id, type_code, description, is_churn) VALUES
    (1, 'NEW_FOLLOWER', 'Profile started following observer', 0),
    (2, 'LOST_FOLLOWER', 'Profile unfollowed observer', 1),
    (3, 'NEW_FOLLOWING', 'Observer started following profile', 0),
    (4, 'UNFOLLOWED', 'Observer unfollowed profile', 1),
    (5, 'BECAME_MUTUAL', 'Relationship became reciprocal', 0),
    (6, 'LOST_MUTUAL', 'Reciprocal connection broken', 1);

INSERT OR IGNORE INTO observers (observer_id, username, email) VALUES
    ('obs_default', 'observer_admin', 'admin@brutus.local');

INSERT OR IGNORE INTO users (user_id, username, full_name, is_verified, is_private) VALUES
    ('1001', 'alice_astronomy', 'Alice Star', 1, 0),
    ('1002', 'bob_cosmology', 'Bob Cosmos', 0, 0),
    ('1003', 'charlie_astrophysics', 'Charlie Light', 0, 1);
