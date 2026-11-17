CREATE TABLE IF NOT EXISTS observers (
    observer_id VARCHAR(64) PRIMARY KEY,
    username VARCHAR(64) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS scan_statuses (
    status_code VARCHAR(32) PRIMARY KEY,
    status_label VARCHAR(64) NOT NULL,
    description TEXT,
    is_valid_for_analysis BOOLEAN NOT NULL DEFAULT FALSE
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
    confidence_score DOUBLE PRECISION NOT NULL CHECK (confidence_score >= 0.0 AND confidence_score <= 1.0),
    started_at TIMESTAMPTZ NOT NULL,
    completed_at TIMESTAMPTZ,
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
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (observer_id) REFERENCES observers(observer_id) ON DELETE CASCADE,
    FOREIGN KEY (scan_id) REFERENCES scans(scan_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS users (
    user_id VARCHAR(64) PRIMARY KEY,
    username VARCHAR(64) NOT NULL UNIQUE,
    full_name VARCHAR(128),
    avatar_url TEXT,
    is_verified BOOLEAN NOT NULL DEFAULT FALSE,
    is_private BOOLEAN NOT NULL DEFAULT FALSE,
    first_seen_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
