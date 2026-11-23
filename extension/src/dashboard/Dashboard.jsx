// Dashboard.jsx — Root component for the full-page analytics dashboard.
//
// What it does:
//   1. On mount, loads current snapshot and scan history from chrome.storage.local.
//   2. Classifies the latest snapshot's followers/following.
//   3. Renders all dashboard sections: Overview, NetworkStats, RelationshipChanges,
//      Timeline, ScanHistory, NetworkGraph, AnomalyPanel.
//   4. Each section handles its own empty/loading state gracefully.
//
// COLLABORATION:
//   - Storage (Prachi): reads chrome.storage.local using STORAGE_KEYS.
//   - Scan data (Kushagra): expects snapshot shape from types/models.js.
//   - Backend (Priyanshu): optionally calls /api/v1/analytics/anomalies/:snapshot_id.

import { useState, useEffect } from 'react';
import './dashboard.css';

import Overview from './components/Overview.jsx';
import NetworkStats from './components/NetworkStats.jsx';
import RelationshipChanges from './components/RelationshipChanges.jsx';
import Timeline from './components/Timeline.jsx';
import ScanHistory from './components/ScanHistory.jsx';
import NetworkGraph from './components/NetworkGraph.jsx';
import AnomalyPanel from './components/AnomalyPanel.jsx';
import Loading from '../components/Loading.jsx';
import ErrorMessage from '../components/ErrorMessage.jsx';

import { classifyRelationships } from '../utils/comparison.js';
import { STORAGE_KEYS } from '../utils/constants.js';

// Optional: backend URL. If the backend is not running, anomaly data will be null.
const BACKEND = 'http://localhost:8000/api/v1';

export default function Dashboard() {
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState(null);
  const [snapshot, setSnapshot]       = useState(null);
  const [prevSnapshot, setPrevSnapshot] = useState(null);
  const [scanHistory, setScanHistory] = useState([]);
  const [classified, setClassified]   = useState(null);
  const [anomaly, setAnomaly]         = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  function loadData() {
    setLoading(true);
    setError(null);

    if (typeof chrome === 'undefined' || !chrome.storage) {
      setLoading(false);
      setError('Extension storage not available. Load inside Chrome extension.');
      return;
    }

    chrome.storage.local.get(
      [STORAGE_KEYS.CURRENT_SNAPSHOT, STORAGE_KEYS.SCAN_HISTORY],
      (result) => {
        const stored  = result[STORAGE_KEYS.CURRENT_SNAPSHOT];
        const history = result[STORAGE_KEYS.SCAN_HISTORY] || [];

        setScanHistory(history);

        if (stored) {
          setSnapshot(stored);

          // The second-most-recent snapshot from history is the "previous" one.
          const sorted = [...history].sort(
            (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
          );
          if (sorted.length >= 2) {
            setPrevSnapshot(sorted[1]);
          }

          // Classify relationships.
          const result = classifyRelationships(
            stored.followers || [],
            stored.following || []
          );
          setClassified(result);

          // Try to fetch anomaly report from the backend.
          if (stored.snapshotId) {
            fetchAnomaly(stored.snapshotId);
          }
        }

        setLoading(false);
      }
    );
  }

  // Optional backend call — if it fails, we simply don't show anomaly data.
  async function fetchAnomaly(snapshotId) {
    try {
      const res = await fetch(`${BACKEND}/analytics/anomalies/${snapshotId}`);
      if (res.ok) {
        const data = await res.json();
        setAnomaly(data);
      }
    } catch {
      // Backend not running — anomaly panel will show its empty state.
    }
  }

  if (loading) return <Loading message="Loading dashboard…" />;

  return (
    <div className="dashboard-root">
      <nav className="dash-nav">
        <div>
          <div className="dash-brand">Brutus</div>
          <div className="dash-sub">Instagram Network Observatory</div>
        </div>
        {snapshot?.observerUsername && (
          <div className="dash-account">@{snapshot.observerUsername}</div>
        )}
      </nav>

      <main className="dash-content">
        {error && <ErrorMessage message={error} onRetry={loadData} />}

        <Overview snapshot={snapshot} />

        <NetworkStats snapshot={snapshot} prevSnapshot={prevSnapshot} />

        <RelationshipChanges
          currentSnapshot={snapshot}
          prevSnapshot={prevSnapshot}
        />

        <Timeline scanHistory={scanHistory} />

        <ScanHistory scanHistory={scanHistory} />

        <NetworkGraph
          classified={classified}
          observerUsername={snapshot?.observerUsername}
        />

        <AnomalyPanel anomaly={anomaly} />
      </main>
    </div>
  );
}
