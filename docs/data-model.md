# Data Model & Relational Architecture

This document outlines the entity model, relationship taxonomies, and time-series snapshot storage conventions implemented in Brutus.

## Core Entities

1. **Observers (`observers`):**
   - The authenticated local user whose personal network is undergoing observation.
   - Primary key: `observer_id`.

2. **Scans (`scans`):**
   - The operational metadata record of a collection run, tracking collected counts, reported counts, errors, and validation confidence scores.

3. **Snapshots (`snapshots`):**
   - A clean, validated baseline state of the observer's network, recording aggregate metrics (`total_followers`, `total_following`, `total_mutuals`).

4. **Users (`users`):**
   - The canonical registry of Instagram profiles discovered within the social graph.

5. **Snapshot Relationships (`snapshot_relationships`):**
   - The edge table joining snapshots to users, categorized into `MUTUAL`, `FOLLOWING_ONLY`, and `FOLLOWER_ONLY`.

6. **Relationship Deltas (`relationship_deltas`):**
   - Historical churn log tracking user transition events between consecutive snapshots.
