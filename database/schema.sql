PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS observers (
    observer_id VARCHAR(64) PRIMARY KEY,
    username VARCHAR(64) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS scan_statuses (
    status_code VARCHAR(32) PRIMARY KEY,
    status_label VARCHAR(64) NOT NULL,
    description TEXT,
    is_valid_for_analysis BOOLEAN NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS scans (
    scan_id VARCHAR(64) PRIMARY KEY,
    observer_id VARCHAR(64) NOT NULL,
    scan_type VARCHAR(32) NOT NULL CHECK (scan_type IN ('FOLLOWERS', 'FOLLOWING', 'FULL')),
    status_code VARCHAR(32) NOT NULL,
    reported_count INTEGER NOT NULL CHECK (reported_count >= 0),
    collected_count INTEGER NOT NULL CHECK (collected_count >= 0),
    duplicate_count INTEGER NOT NULL DEFAULT 0 CHECK (duplicate_count >= 0),
    error_count INTEGER NOT NULL DEFAULT 0 CHECK (error_count >= 0),
    confidence_score REAL NOT NULL CHECK (confidence_score >= 0.0 AND confidence_score <= 1.0),
    started_at TIMESTAMP NOT NULL,
    completed_at TIMESTAMP,
    FOREIGN KEY (observer_id) REFERENCES observers(observer_id) ON DELETE CASCADE,
    FOREIGN KEY (status_code) REFERENCES scan_statuses(status_code)
);

CREATE TABLE IF NOT EXISTS snapshots (
    snapshot_id VARCHAR(64) PRIMARY KEY,
    observer_id VARCHAR(64) NOT NULL,
    scan_id VARCHAR(64) NOT NULL UNIQUE,
    total_followers INTEGER NOT NULL DEFAULT 0 CHECK (total_followers >= 0),
    total_following INTEGER NOT NULL DEFAULT 0 CHECK (total_following >= 0),
    total_mutuals INTEGER NOT NULL DEFAULT 0 CHECK (total_mutuals >= 0),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (observer_id) REFERENCES observers(observer_id) ON DELETE CASCADE,
    FOREIGN KEY (scan_id) REFERENCES scans(scan_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS users (
    user_id VARCHAR(64) PRIMARY KEY,
    username VARCHAR(64) NOT NULL UNIQUE,
    full_name VARCHAR(128),
    avatar_url TEXT,
    is_verified BOOLEAN NOT NULL DEFAULT 0,
    is_private BOOLEAN NOT NULL DEFAULT 0,
    first_seen_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS relationship_types (
    relationship_type_id INTEGER PRIMARY KEY,
    type_code VARCHAR(32) NOT NULL UNIQUE,
    type_label VARCHAR(64) NOT NULL,
    follows_observer BOOLEAN NOT NULL,
    followed_by_observer BOOLEAN NOT NULL,
    is_mutual BOOLEAN NOT NULL
);

CREATE TABLE IF NOT EXISTS snapshot_relationships (
    snapshot_id VARCHAR(64) NOT NULL,
    target_user_id VARCHAR(64) NOT NULL,
    relationship_type_id INTEGER NOT NULL,
    observed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (snapshot_id, target_user_id),
    FOREIGN KEY (snapshot_id) REFERENCES snapshots(snapshot_id) ON DELETE CASCADE,
    FOREIGN KEY (target_user_id) REFERENCES users(user_id) ON DELETE RESTRICT,
    FOREIGN KEY (relationship_type_id) REFERENCES relationship_types(relationship_type_id)
);

CREATE TABLE IF NOT EXISTS change_types (
    change_type_id INTEGER PRIMARY KEY,
    type_code VARCHAR(32) NOT NULL UNIQUE,
    description VARCHAR(128) NOT NULL,
    is_churn BOOLEAN NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS relationship_deltas (
    delta_id INTEGER PRIMARY KEY AUTOINCREMENT,
    from_snapshot_id VARCHAR(64) NOT NULL,
    to_snapshot_id VARCHAR(64) NOT NULL,
    target_user_id VARCHAR(64) NOT NULL,
    change_type_id INTEGER NOT NULL,
    detected_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (from_snapshot_id) REFERENCES snapshots(snapshot_id) ON DELETE CASCADE,
    FOREIGN KEY (to_snapshot_id) REFERENCES snapshots(snapshot_id) ON DELETE CASCADE,
    FOREIGN KEY (target_user_id) REFERENCES users(user_id) ON DELETE RESTRICT,
    FOREIGN KEY (change_type_id) REFERENCES change_types(change_type_id),
    CONSTRAINT uq_delta_event UNIQUE (from_snapshot_id, to_snapshot_id, target_user_id, change_type_id)
);

CREATE TABLE IF NOT EXISTS snapshot_metrics (
    metric_id INTEGER PRIMARY KEY AUTOINCREMENT,
    snapshot_id VARCHAR(64) NOT NULL UNIQUE,
    reciprocity_ratio REAL NOT NULL CHECK (reciprocity_ratio >= 0.0 AND reciprocity_ratio <= 1.0),
    turnover_rate REAL NOT NULL CHECK (turnover_rate >= 0.0),
    network_density REAL CHECK (network_density >= 0.0 AND network_density <= 1.0),
    computed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (snapshot_id) REFERENCES snapshots(snapshot_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_snapshots_observer ON snapshots(observer_id);
CREATE INDEX IF NOT EXISTS idx_scans_observer ON scans(observer_id);
CREATE INDEX IF NOT EXISTS idx_relationships_user ON snapshot_relationships(target_user_id);
CREATE INDEX IF NOT EXISTS idx_deltas_target_user ON relationship_deltas(target_user_id);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
