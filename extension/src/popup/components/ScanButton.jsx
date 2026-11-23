// ScanButton.jsx — Button to trigger a manual Instagram scan.
// Disables itself while a scan is running so the user cannot trigger duplicate scans.

export default function ScanButton({ scanning, onScan }) {
  return (
    <button
      className="btn-scan"
      onClick={onScan}
      disabled={scanning}
    >
      {scanning ? 'Scanning…' : 'Scan Now'}
    </button>
  );
}
