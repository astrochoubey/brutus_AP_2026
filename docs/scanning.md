# Scanning & Collection

This document describes the non-invasive data collection pipeline used by the Brutus Chrome extension to extract social graph relationships from the Instagram web client.

## 1. Extraction Strategy
- **Passive DOM Inspection:** Operates solely on elements rendered in the active viewport during user-initiated scrolling in follower/following modals.
- **Dynamic Throttle Control:** Employs exponential backoff with randomized inter-request delays (800ms - 2200ms) to respect client rate limits and avoid triggering platform abuse heuristics.
- **Scroll Pagination Orchestration:** Tracks viewport scroll height increments, waiting for network response completion before dispatching subsequent scroll triggers.

## 2. Validation Checkpoints
Before any scan is finalized or used for snapshot creation, it passes through three integrity gates:
1. **DOM Counter Match:** The extracted profile count is compared against the counter displayed in the user profile header (`reported_count`).
2. **Duplicate Detection:** Extracted profiles are deduplicated by `user_id`. Excessive duplicate frequencies signal DOM virtualization re-renders.
3. **Missing Item Thresholds:** If the completeness ratio (`collected_count / reported_count`) falls below 95%, the scan is flagged as `PARTIAL` and quarantined from automatic baseline comparison.
