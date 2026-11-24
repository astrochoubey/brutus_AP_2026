// Popup.jsx — Root component for the Chrome extension popup.
//
// What it does:
//   1. On mount, loads the current snapshot from chrome.storage.local.
//   2. Classifies relationships deterministically using classifyRelationships().
//   3. Supports dedicated and contextual scanning for Followers and Following.
//   4. Interactive metric cards that filter the user list on click.
//   5. Search bar with instant filtering by handle or name.

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
import ErrorMessage from '../components/ErrorMessage.jsx';

import { classifyRelationships } from '../utils/comparison.js';
import { STORAGE_KEYS, SCAN_STATUS, FILTER } from '../utils/constants.js';
import { sendChromeMessage } from '../messaging/sendMessage.js';
import { MSG } from '../messaging/messageTypes.js';

export default function Popup() {
  // State: data loading
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // State: scan control
  const [scanning, setScanning] = useState(false);
  const [scanStatus, setScanStatus] = useState(SCAN_STATUS.IDLE);
  const [scanMeta, setScanMeta] = useState(null);
  const [lastScanType, setLastScanType] = useState('scanFollowers');

  // State: network data
  const [snapshot, setSnapshot] = useState(null);
  const [classified, setClassified] = useState(null);

  // State: list controls
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState(FILTER.ALL);

  // Load stored snapshot when popup opens.
  useEffect(() => {
    loadStoredSnapshot();
  }, []);

  // Listen for messages from the service worker while the popup is open.
  useEffect(() => {
    if (typeof chrome === 'undefined' || !chrome.runtime) return;

    function handleMessage(msg) {
      if (msg.action === MSG.SCAN_PROGRESS || msg.type === 'SCAN_PROGRESS') {
        setScanStatus(SCAN_STATUS.SCANNING);
      }
      if (msg.action === MSG.SCAN_COMPLETE || msg.type === 'SCAN_COMPLETE') {
        setScanning(false);
        setScanStatus(msg.status || SCAN_STATUS.COMPLETE);
        loadStoredSnapshot();
      }
    }

    chrome.runtime.onMessage.addListener(handleMessage);
    return () => chrome.runtime.onMessage.removeListener(handleMessage);
  }, []);

  function loadStoredSnapshot() {
    setLoading(true);
    setError(null);

    // Guard: chrome.storage is only available inside the extension.
    if (typeof chrome === 'undefined' || !chrome.storage) {
      setLoading(false);
      setError('Extension storage not available. Load this inside Chrome.');
      return;
    }

    chrome.storage.local.get(
      [STORAGE_KEYS.CURRENT_SNAPSHOT],
      (result) => {
        const stored = result[STORAGE_KEYS.CURRENT_SNAPSHOT];
        if (stored) {
          applySnapshot(stored);
        }
        setLoading(false);
      }
    );
  }

  // Takes a stored snapshot object and derives classified relationships from it.
  function applySnapshot(stored) {
    setSnapshot(stored);

    if (stored.scanMeta) {
      setScanMeta(stored.scanMeta);
      setScanStatus(stored.scanMeta.status || SCAN_STATUS.COMPLETE);
    } else {
      setScanStatus(SCAN_STATUS.COMPLETE);
    }

    const followers = stored.followers || [];
    const following = stored.following || [];
    const result = classifyRelationships(followers, following);
    setClassified(result);
  }

  async function handleScan(scanType) {
    setScanning(true);
    setScanStatus(SCAN_STATUS.SCANNING);
    setError(null);

    // Determine target scan type if not specified
    let targetType = scanType;
    if (!targetType) {
      if (snapshot?.followers?.length > 0 && (!snapshot?.following || snapshot?.following?.length === 0)) {
        targetType = 'scanFollowing';
      } else {
        targetType = 'scanFollowers';
      }
    }
    setLastScanType(targetType);

    try {
      const res = await sendChromeMessage(targetType);
      if (res && (res.error || res.success === false)) {
        setScanning(false);
        setScanStatus(SCAN_STATUS.FAILED);
        setError(res.error || 'Scan could not be completed.');
      } else if (res && (res.snapshot || res.snapshotCreated || res.success)) {
        setScanning(false);
        setScanStatus(SCAN_STATUS.COMPLETE);
        loadStoredSnapshot();
      }
    } catch (err) {
      setScanning(false);
      setScanStatus(SCAN_STATUS.FAILED);
      setError(err.message || 'Could not start scan. Make sure you are on instagram.com.');
    }
  }

  function openDashboard() {
    if (typeof chrome !== 'undefined' && chrome.tabs) {
      chrome.tabs.create({ url: chrome.runtime.getURL('index.html') });
    }
  }

  function getStatusDetail() {
    if (!scanMeta) return '';
    if (scanStatus === SCAN_STATUS.SCANNING) return 'Collecting accounts…';
    if (scanStatus === SCAN_STATUS.PARTIAL) {
      return `${scanMeta.collectedCount} / ${scanMeta.reportedCount} collected`;
    }
    return '';
  }

  // Calculate counts for FilterBar badges
  const filterCounts = classified ? {
    all: (classified.notFollowingBack?.length || 0) + (classified.mutuals?.length || 0) + (classified.dontFollowBack?.length || 0),
    notFollowingBack: classified.notFollowingBack?.length || 0,
    mutuals: classified.mutuals?.length || 0,
    dontFollowBack: classified.dontFollowBack?.length || 0
  } : {};

  const totalFollowersCount = snapshot?.followers?.length || snapshot?.stats?.followersCount || 0;
  const totalFollowingCount = snapshot?.following?.length || snapshot?.stats?.followingCount || 0;

  if (loading) return <Loading message="Loading network data…" />;

  return (
    <div className="popup-root">
      <Header
        account={snapshot?.observerUsername}
        onOpenDashboard={openDashboard}
      />

      <div className="popup-body">
        {error && (
          <ErrorMessage
            message={error}
            onRetry={() => handleScan(lastScanType)}
          />
        )}

        <ScanStatus status={scanStatus} detail={getStatusDetail()} />

        <ScanButton
          scanning={scanning}
          onScan={handleScan}
          followersCount={totalFollowersCount}
          followingCount={totalFollowingCount}
        />

        <Stats
          snapshot={snapshot}
          activeFilter={filter}
          onSelectFilter={(selectedFilter) => setFilter(selectedFilter)}
        />

        <RelationshipSummary summary={classified?.summary} />

        {classified && (
          <>
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
              totalFollowing={totalFollowingCount}
            />
          </>
        )}

        <DataQuality scanMeta={scanMeta} />
      </div>
    </div>
  );
}
