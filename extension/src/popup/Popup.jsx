// Popup.jsx — Root coordinator for the Brutus Chrome extension popup.
//
// Features:
//   1. Persistent local snapshot loading without mutating or erasing prior valid scans.
//   2. Deterministic set-theory relationship classification (classifyRelationships).
//   3. Full 5-state Restart Scan implementation with duplicate click prevention.
//   4. Interactive 2x2 metric filtering, instant handle search, and live audience Explorer.
//   5. Data quality integrity auditing and partial-scan alerting.

import { useState, useEffect } from 'react';
import './popup.css';

import Header from './components/Header.jsx';
import ScanButton from './components/ScanButton.jsx';
import ScanStatus from './components/ScanStatus.jsx';
import Stats from './components/Stats.jsx';
import RelationshipSummary from './components/RelationshipSummary.jsx';
import SearchBar from './components/SearchBar.jsx';
import FilterBar from './components/FilterBar.jsx';
import UserList from './components/UserList.jsx';
import DataQuality from './components/DataQuality.jsx';
import Loading from '../components/Loading.jsx';

import { classifyRelationships } from '../utils/comparison.js';
import { STORAGE_KEYS, SCAN_STATUS, FILTER } from '../utils/constants.js';
import { sendChromeMessage } from '../messaging/sendMessage.js';
import { MSG } from '../messaging/messageTypes.js';

export default function Popup() {
  // State: Loading & Error
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState(null);

  // State: Scan Orchestration & Metadata
  const [scanning, setScanning]       = useState(false);
  const [scanStatus, setScanStatus]   = useState(SCAN_STATUS.IDLE);
  const [scanMeta, setScanMeta]       = useState(null);
  const [lastScanType, setLastScanType] = useState('scanFollowers');

  // State: Network Datasets
  const [snapshot, setSnapshot]       = useState(null);
  const [classified, setClassified]   = useState(null);

  // State: Audience Explorer Controls
  const [query, setQuery]             = useState('');
  const [filter, setFilter]           = useState(FILTER.ALL);

  // Load stored snapshot on initial popup mount
  useEffect(() => {
    loadStoredSnapshot();
  }, []);

  // Listen for background service worker progress and completion broadcasts
  useEffect(() => {
    if (typeof chrome === 'undefined' || !chrome.runtime) return;

    function handleRuntimeMessage(msg) {
      if (msg.action === MSG.SCAN_PROGRESS || msg.type === 'SCAN_PROGRESS') {
        setScanStatus(SCAN_STATUS.SCANNING);
      }
      if (msg.action === MSG.SCAN_COMPLETE || msg.type === 'SCAN_COMPLETE') {
        setScanning(false);
        setScanStatus(msg.status || SCAN_STATUS.COMPLETE);
        loadStoredSnapshot();
      }
    }

    chrome.runtime.onMessage.addListener(handleRuntimeMessage);
    return () => chrome.runtime.onMessage.removeListener(handleRuntimeMessage);
  }, []);

  function loadStoredSnapshot() {
    setLoading(true);
    setError(null);

    if (typeof chrome === 'undefined' || !chrome.storage) {
      setLoading(false);
      setError('Extension storage is unavailable in this environment.');
      return;
    }

    chrome.storage.local.get(
      [STORAGE_KEYS.CURRENT_SNAPSHOT],
      (result) => {
        const stored = result[STORAGE_KEYS.CURRENT_SNAPSHOT];
        if (stored) {
          applySnapshot(stored);
        } else {
          setScanStatus(SCAN_STATUS.IDLE);
        }
        setLoading(false);
      }
    );
  }

  function applySnapshot(stored) {
    setSnapshot(stored);

    if (stored.scanMeta) {
      setScanMeta(stored.scanMeta);
      setScanStatus(stored.scanMeta.status || SCAN_STATUS.COMPLETE);
    } else if (stored.isIncomplete) {
      setScanStatus(SCAN_STATUS.PARTIAL);
    } else {
      setScanStatus(SCAN_STATUS.COMPLETE);
    }

    const followers = stored.followers || [];
    const following = stored.following || [];
    const classification = classifyRelationships(followers, following);
    setClassified(classification);
  }

  async function handleScan(targetType) {
    // Prevent duplicate triggers
    if (scanning) return;

    setScanning(true);
    setScanStatus(SCAN_STATUS.SCANNING);
    setError(null);

    // Auto-resolve target action if unspecified
    let action = targetType;
    if (!action) {
      if (snapshot?.followers?.length > 0 && (!snapshot?.following || snapshot?.following?.length === 0)) {
        action = 'scanFollowing';
      } else {
        action = 'scanFollowers';
      }
    }
    setLastScanType(action);

    try {
      const res = await sendChromeMessage(action);

      if (res && (res.error || res.success === false)) {
        setScanning(false);
        setScanStatus(SCAN_STATUS.FAILED);
        setError(res.error || 'Scan could not be completed.');
      } else if (res && (res.snapshot || res.snapshotCreated || res.success)) {
        setScanning(false);
        setScanStatus(SCAN_STATUS.COMPLETE);
        loadStoredSnapshot();
      } else {
        setScanning(false);
      }
    } catch (err) {
      setScanning(false);
      setScanStatus(SCAN_STATUS.FAILED);
      setError(err.message || 'Scan trigger failed. Make sure you are on instagram.com.');
    }
  }

  function openDashboard() {
    if (typeof chrome !== 'undefined' && chrome.tabs) {
      chrome.tabs.create({ url: chrome.runtime.getURL('index.html') });
    }
  }

  function getStatusDetail() {
    if (scanning) return 'Collecting accounts…';
    if (scanMeta && scanStatus === SCAN_STATUS.PARTIAL) {
      return `${(scanMeta.collectedCount ?? 0).toLocaleString()} / ${(scanMeta.reportedCount ?? 0).toLocaleString()} collected`;
    }
    return '';
  }

  // Calculate live counts for FilterBar pills
  const filterCounts = classified ? {
    all: (classified.notFollowingBack?.length || 0) + (classified.mutuals?.length || 0) + (classified.dontFollowBack?.length || 0),
    notFollowingBack: classified.notFollowingBack?.length || 0,
    mutuals: classified.mutuals?.length || 0,
    dontFollowBack: classified.dontFollowBack?.length || 0
  } : {};

  const totalFollowers = snapshot?.totalFollowers ?? snapshot?.followers?.length ?? 0;
  const totalFollowing = snapshot?.totalFollowing ?? snapshot?.following?.length ?? 0;
  const hasData = Boolean(snapshot);
  const isPartial = Boolean(snapshot?.isIncomplete || scanStatus === SCAN_STATUS.PARTIAL);

  if (loading) return <Loading message="Loading network observatory…" />;

  return (
    <div className="popup-canvas">
      {/* 1. Header */}
      <Header
        account={snapshot?.observerUsername}
        onOpenDashboard={openDashboard}
      />

      <div className="popup-scroll-body">
        {/* Error notification banner with retry action */}
        {error && (
          <div className="popup-error-banner" role="alert">
            <div className="error-msg-row">
              <span className="error-icon" aria-hidden="true">⚠️</span>
              <span className="error-text">{error}</span>
            </div>
            <button
              className="error-retry-btn"
              onClick={() => handleScan(lastScanType)}
              type="button"
            >
              Retry
            </button>
          </div>
        )}

        {/* 2. Main Scan Area */}
        <section className="popup-section scan-hero-section">
          <ScanStatus
            status={scanStatus}
            detail={getStatusDetail()}
            lastScanTime={snapshot?.timestamp}
          />

          <ScanButton
            scanning={scanning}
            scanStatus={scanStatus}
            hasData={hasData}
            isPartial={isPartial}
            hasError={Boolean(error || scanStatus === SCAN_STATUS.FAILED)}
            onScan={handleScan}
            followersCount={totalFollowers}
            followingCount={totalFollowing}
          />
        </section>

        {/* 3. Statistics (2×2 Grid) */}
        <section className="popup-section stats-section">
          <Stats
            snapshot={snapshot}
            activeFilter={filter}
            onSelectFilter={(newFilter) => setFilter(newFilter)}
          />
        </section>

        {/* 4. Relationship Overview */}
        <section className="popup-section relationship-section">
          <RelationshipSummary summary={classified?.summary} />
        </section>

        {/* 5. Audience Explorer / User List */}
        {classified && (
          <section className="popup-section audience-explorer-section">
            <SearchBar query={query} onChange={setQuery} />
            <FilterBar
              active={filter}
              onFilter={setFilter}
              counts={filterCounts}
            />
            <UserList
              classified={classified}
              query={query}
              filter={filter}
              totalFollowing={totalFollowing}
            />
          </section>
        )}

        {/* 6. Data Quality */}
        {scanMeta && (
          <section className="popup-section quality-section">
            <DataQuality scanMeta={scanMeta} />
          </section>
        )}
      </div>
    </div>
  );
}
