// Popup.jsx — Root component for the Chrome extension popup.
//
// What it does:
//   1. On mount, tries to load the current snapshot from chrome.storage.local.
//   2. Classifies followers/following using classifyRelationships() from comparison.js.
//   3. Renders Header, ScanStatus, Stats, RelationshipSummary, SearchBar, FilterBar,
//      UserList, DataQuality — all with real data or proper empty/loading states.
//   4. Scan button sends a START_SCAN message to the service worker.
//
// COLLABORATION:
//   - Storage layer (Prachi): snapshots.js is a stub. We read chrome.storage.local directly
//     using the agreed STORAGE_KEYS from constants.js. When Prachi's implementation lands,
//     these keys will still work because they use the same storage.
//   - Scan data (Kushagra): The snapshot shape we read matches NetworkSnapshot + ScanMetadata
//     from types/models.js. When Kushagra's scanner writes data, it will be available here.

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
      if (msg.action === MSG.SCAN_PROGRESS) {
        setScanStatus(SCAN_STATUS.SCANNING);
      }
      if (msg.action === MSG.SCAN_COMPLETE) {
        setScanning(false);
        setScanStatus(msg.status || SCAN_STATUS.COMPLETE);
        // Reload data after a completed scan.
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

    // Scan metadata lives alongside the snapshot.
    if (stored.scanMeta) {
      setScanMeta(stored.scanMeta);
      setScanStatus(stored.scanMeta.status || SCAN_STATUS.COMPLETE);
    }

    // Classify using existing utility — no calculation duplicated here.
    const followers = stored.followers || [];
    const following = stored.following || [];
    const result = classifyRelationships(followers, following);
    setClassified(result);
  }

  async function handleScan() {
    setScanning(true);
    setScanStatus(SCAN_STATUS.SCANNING);
    setError(null);

    try {
      const res = await sendChromeMessage(MSG.START_SCAN);
      if (res && (res.error || res.success === false)) {
        setScanning(false);
        setScanStatus(SCAN_STATUS.FAILED);
        setError(res.error || 'Scan could not be started.');
      } else if (res && (res.snapshot || res.snapshotCreated)) {
        setScanning(false);
        setScanStatus(SCAN_STATUS.COMPLETE);
        loadStoredSnapshot();
      } else if (res && res.success && res.followers && res.followers.length > 0) {
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

  // Derive a readable detail string for the status badge.
  function getStatusDetail() {
    if (!scanMeta) return '';
    if (scanStatus === SCAN_STATUS.SCANNING) return 'Please wait…';
    if (scanStatus === SCAN_STATUS.PARTIAL) {
      return `${scanMeta.collectedCount} / ${scanMeta.reportedCount} collected`;
    }
    return '';
  }

  if (loading) return <Loading message="Loading snapshot…" />;

  return (
    <div className="popup-root">
      <Header
        account={snapshot?.observerUsername}
        onOpenDashboard={openDashboard}
      />

      <div className="popup-body">
        {error && <ErrorMessage message={error} onRetry={loadStoredSnapshot} />}

        <ScanStatus status={scanStatus} detail={getStatusDetail()} />
        <ScanButton scanning={scanning} onScan={handleScan} />

        {!snapshot && (
          <div style={{
            fontSize: '0.78rem',
            color: 'var(--teal-waters)',
            background: 'var(--glacial-sky)',
            padding: '8px 10px',
            borderRadius: 'var(--radius)',
            textAlign: 'center',
            lineHeight: 1.4
          }}>
            💡 <strong>How to scan:</strong> Click <strong>followers</strong> or <strong>following</strong> on your Instagram profile to open the modal, then click <strong>Scan Now</strong>.
          </div>
        )}

        <Stats snapshot={snapshot} />
        <RelationshipSummary summary={classified?.summary} />

        {classified && (
          <>
            <SearchBar query={query} onChange={setQuery} />
            <FilterBar active={filter} onFilter={setFilter} />
            <UserList classified={classified} query={query} filter={filter} />
          </>
        )}

        <DataQuality scanMeta={scanMeta} />
      </div>
    </div>
  );
}
