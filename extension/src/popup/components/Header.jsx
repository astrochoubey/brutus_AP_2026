// Header.jsx — Apple-level compact navbar with branding, account status, and dashboard link.

export default function Header({ account, onOpenDashboard }) {
  return (
    <header className="popup-header">
      <div className="header-brand-group">
        <div className="header-icon-wrap" aria-hidden="true">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" fill="var(--spring-meadow)" stroke="var(--teal-waters)" />
          </svg>
        </div>
        <div>
          <h1 className="brand-name">Brutus</h1>
          <div className="brand-sub">Instagram Observatory</div>
        </div>
      </div>

      <div className="header-actions">
        {account && (
          <div className="header-account-pill" title={`Logged in as @${account}`}>
            <span className="account-dot" />
            <span className="account-handle">@{account}</span>
          </div>
        )}
        <button
          className="btn-dashboard"
          onClick={onOpenDashboard}
          title="Open full analytics dashboard in a new tab"
          type="button"
        >
          Dashboard ↗
        </button>
      </div>
    </header>
  );
}
