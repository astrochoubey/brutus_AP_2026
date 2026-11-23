// Header.jsx — Popup header with branding, account info, and dashboard link.

export default function Header({ account, onOpenDashboard }) {
  return (
    <header className="popup-header">
      <div>
        <div className="brand-name">Brutus</div>
        <div className="brand-sub">Instagram Network Observatory</div>
        {account && <div className="header-account">@{account}</div>}
      </div>
      <button className="btn-dashboard" onClick={onOpenDashboard}>
        Dashboard ↗
      </button>
    </header>
  );
}
