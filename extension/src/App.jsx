// App.jsx — Main React application component.
//
// This app serves as the dashboard (full-page tab).
// The popup has its own separate HTML entry (popup.html → Popup.jsx).
//
// When the user opens Brutus in a new tab (via the popup's Dashboard button),
// they see this component — the full Dashboard.

import Dashboard from './dashboard/Dashboard.jsx';
import './styles.css';

export default function App() {
  return <Dashboard />;
}
