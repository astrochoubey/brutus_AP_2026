// Dashboard.jsx — Apple-Grade full-page network observatory dashboard.
//
// Features:
//   1. Persistent snapshot history retrieval and multi-snapshot delta analysis.
//   2. Clean top navigation with observer branding and live account status.
//   3. Structured analytical grid: Overview KPIs, Network Stats, Relationship Changes,
//      Native SVG Network Graph, Historical Timeline, Scan History Table, Anomaly Panel.
//   4. Responsive layout with balanced whitespace and strict 4-color palette tokens.

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

const BACKEND = 'http://localhost:8000/api/v1';

export default function Dashboard() {
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState(null);
  const [snapshot, setSnapshot]         = useState(null);
  const [prevSnapshot, setPrevSnapshot] = useState(null);
  const [scanHistory, setScanHistory]   = useState([]);
  const [classified, setClassified]     = useState(null);
  const [anomaly, setAnomaly]           = useState(null);

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
      [STORAGE_KEYS.CURRENT_SNAPSHOT, STORAGE_KEYS.SCAN_HISTORY, STORAGE_KEYS.SNAPSHOTS],
      (result) => {
        const stored  = result[STORAGE_KEYS.CURRENT_SNAPSHOT];
        const history = result[STORAGE_KEYS.SCAN_HISTORY] || result[STORAGE_KEYS.SNAPSHOTS] || [];

        setScanHistory(history);

        if (stored) {
          setSnapshot(stored);

          // Find the previous valid snapshot in history
          const sorted = [...history].sort(
            (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
          );
          if (sorted.length >= 2) {
            setPrevSnapshot(sorted[1]);
          }

          // Classify relationships deterministically
          const resultClassified = classifyRelationships(
            stored.followers || [],
            stored.following || []
          );
          setClassified(resultClassified);

          // Fetch anomaly report if snapshot ID is present
          if (stored.snapshotId) {
            fetchAnomaly(stored.snapshotId);
          }
        }

        setLoading(false);
      }
    );
  }

  async function fetchAnomaly(snapshotId) {
    try {
      const res = await fetch(`${BACKEND}/analytics/anomalies/${snapshotId}`);
      if (res.ok) {
        const data = await res.json();
        setAnomaly(data);
      }
    } catch {
      // Backend not running — anomaly panel will show its clean empty state.
    }
  }

  if (loading) return <Loading message="Loading network dashboard…" />;

  return (
    <div className="dash-canvas">
      {/* 1. Top Navigation */}
      <header className="dash-navbar">
        <div className="dash-nav-container">
          <div className="dash-brand-cluster">
            <div className="dash-logo-mark" aria-hidden="true">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <circle cx="12" cy="12" r="10" />
                <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" fill="var(--spring-meadow)" stroke="var(--teal-waters)" />
              </svg>
            </div>
            <div>
              <div className="dash-title">Brutus</div>
              <div className="dash-tagline">Instagram Network Observatory</div>
            </div>
          </div>

          <div className="dash-nav-meta">
            {snapshot?.observerUsername && (
              <div className="dash-account-chip">
                <span className="live-dot" />
                <span>@{snapshot.observerUsername}</span>
              </div>
            )}
            <button
              className="dash-refresh-btn"
              onClick={loadData}
              title="Refresh stored snapshot data"
              type="button"
            >
              Refresh Data ↻
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="dash-main-layout">
        {error && <ErrorMessage message={error} onRetry={loadData} />}

        {/* 2. Overview Ribbon */}
        <section className="dash-section">
          <Overview snapshot={snapshot} />
        </section>

        {/* 3 & 4. Analytics Grid: Network Stats + Relationship Changes */}
        <div className="dash-grid-two-col">
          <section className="dash-card">
            <NetworkStats snapshot={snapshot} prevSnapshot={prevSnapshot} />
          </section>

          <section className="dash-card">
            <RelationshipChanges
              currentSnapshot={snapshot}
              prevSnapshot={prevSnapshot}
            />
          </section>
        </div>

        {/* 5. Native SVG Network Graph */}
        <section className="dash-card">
          <NetworkGraph
            classified={classified}
            observerUsername={snapshot?.observerUsername}
          />
        </section>

        {/* 6 & 7. Historical Records: Timeline + Scan History */}
        <div className="dash-grid-two-col">
          <section className="dash-card">
            <Timeline scanHistory={scanHistory} />
          </section>

          <section className="dash-card">
            <ScanHistory scanHistory={scanHistory} />
          </section>
        </div>

        {/* 8. Anomaly Panel */}
        <section className="dash-card">
          <AnomalyPanel anomaly={anomaly} />
        </section>
      </main>
    </div>
  );
}
