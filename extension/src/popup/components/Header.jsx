// Header.jsx — Portfolio-inspired floating navbar header.

export default function Header({ account, onOpenDashboard }) {
  return (
    <header className="popup-header">
      <div className="header-brand-group">
        <div className="header-icon-wrap" aria-hidden="true">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" stroke="var(--accent-gold)" />
            <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" fill="var(--accent-gold)" stroke="var(--bg-primary)" />
          </svg>
        </div>
        <div>
          <div className="brand-title-row">
            <h1 className="brand-name">BRUTUS</h1>
            <span className="brand-dot" aria-hidden="true">.</span>
          </div>
          <div className="brand-sub">NETWORK OBSERVATORY</div>
        </div>
      </div>

      <div className="header-actions">
        {account && (
          <div className="header-account-pill" title={`Observer Account: @${account}`}>
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
          DASHBOARD ↗
        </button>
      </div>
    </header>
  );
}
