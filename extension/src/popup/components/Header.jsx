// Header.jsx — Clean, human-crafted header.

export default function Header({ account, onOpenDashboard }) {
  return (
    <header className="popup-header">
      <div className="header-brand-group">
        <div className="header-icon-wrap" aria-hidden="true">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" stroke="var(--olive-main)" />
            <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" fill="var(--olive-main)" stroke="var(--olive-main)" />
          </svg>
        </div>
        <div>
          <div className="brand-title-row">
            <h1 className="brand-name">Brutus</h1>
          </div>
          <div className="brand-sub">Instagram Network Observatory</div>
        </div>
      </div>

      <div className="header-actions">
        {account && (
          <div className="header-account-pill" title={`Observer: @${account}`}>
            <span className="account-dot" />
            <span className="account-handle">@{account}</span>
          </div>
        )}
        <button
          className="btn-dashboard"
          onClick={onOpenDashboard}
          title="Open complete analytics dashboard"
          type="button"
        >
          Dashboard ↗
        </button>
      </div>
    </header>
  );
}
