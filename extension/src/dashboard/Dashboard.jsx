// Dashboard.jsx — Full-Page Network Observatory Dashboard.
// Clear Grey + Olive Design System with robust asynchronous data retrieval.

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

  async function loadData() {
    setLoading(true);
    setError(null);

    if (typeof chrome === 'undefined' || !chrome.storage || !chrome.storage.local) {
      setLoading(false);
      setError('Extension storage is unavailable in this environment.');
      return;
    }

    try {
      const keys = [
        STORAGE_KEYS.CURRENT_SNAPSHOT,
        STORAGE_KEYS.SCAN_HISTORY,
        STORAGE_KEYS.SNAPSHOTS
      ];

      // Safely fetch from chrome.storage.local with race timeout
      const storagePromise = new Promise((resolve) => {
        try {
          const ret = chrome.storage.local.get(keys, (res) => {
            if (chrome.runtime?.lastError) {
              console.warn('Storage read warning:', chrome.runtime.lastError.message);
              resolve({});
            } else {
              resolve(res || {});
            }
          });
          // In Manifest V3 if chrome.storage.local.get returns a promise:
          if (ret && typeof ret.then === 'function') {
            ret.then(resolve).catch(() => resolve({}));
          }
        } catch (e) {
          console.warn('chrome.storage.local.get threw:', e);
          resolve({});
        }
      });

      // 3-second safety timeout guarantees the dashboard will never hang
      const timeoutPromise = new Promise((resolve) => setTimeout(() => resolve({}), 3000));
      const result = (await Promise.race([storagePromise, timeoutPromise])) || {};

      const stored = result[STORAGE_KEYS.CURRENT_SNAPSHOT] || null;
      const historyRaw = result[STORAGE_KEYS.SCAN_HISTORY] || result[STORAGE_KEYS.SNAPSHOTS] || [];
      const history = Array.isArray(historyRaw) ? historyRaw : [];

      setScanHistory(history);

      if (stored) {
        setSnapshot(stored);

        if (history.length >= 2) {
          const sorted = [...history].sort(
            (a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0)
          );
          setPrevSnapshot(sorted[1]);
        }

        try {
          const resultClassified = classifyRelationships(
            Array.isArray(stored.followers) ? stored.followers : [],
            Array.isArray(stored.following) ? stored.following : []
          );
          setClassified(resultClassified);
        } catch (err) {
          console.warn('classifyRelationships warning:', err);
        }

        if (stored.snapshotId) {
          fetchAnomaly(stored.snapshotId);
        }
      }
    } catch (err) {
      console.error('Dashboard loadData caught error:', err);
      setError('Failed to load snapshot records from extension storage.');
    } finally {
      // Guaranteed completion: loading screen will always dismiss cleanly
      setLoading(false);
    }
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

  if (loading) {
    return (
      <div className="dash-canvas dash-loading-screen">
        <Loading message="Loading network dashboard…" />
      </div>
    );
  }

  return (
    <div className="dash-canvas">
      {/* 1. Top Navigation */}
      <header className="dash-navbar">
        <div className="dash-nav-container">
          <div className="dash-brand-cluster">
            <div className="dash-logo-mark" aria-hidden="true">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <circle cx="12" cy="12" r="10" stroke="var(--olive-main)" />
                <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" fill="var(--olive-main)" stroke="var(--olive-main)" />
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
