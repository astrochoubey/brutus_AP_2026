// messageTypes.js
// Message action type constants used between the popup, dashboard,
// and the background service worker.
//
// COLLABORATION NOTE:
// Prachi owns the service worker and sendMessage/messageHandlers implementation.
// These constants define the agreed message contract so both the UI (Priyanshu)
// and the service worker (Prachi) use the same action strings.

export const MSG = {
  // Sent from the popup to ask the service worker to start a full scan.
  START_SCAN: 'START_SCAN',

  // Sent from the service worker back to the popup with scan progress updates.
  SCAN_PROGRESS: 'SCAN_PROGRESS',

  // Sent when a scan finishes (complete, partial, or failed).
  SCAN_COMPLETE: 'SCAN_COMPLETE',

  // Sent from the popup or dashboard to request the latest snapshot data.
  GET_SNAPSHOT: 'GET_SNAPSHOT',

  // Response carrying the snapshot data.
  SNAPSHOT_DATA: 'SNAPSHOT_DATA',

  // Request for the full scan history list.
  GET_SCAN_HISTORY: 'GET_SCAN_HISTORY',

  // Response carrying the scan history list.
  SCAN_HISTORY_DATA: 'SCAN_HISTORY_DATA',

  // Generic error response.
  ERROR: 'ERROR'
};
