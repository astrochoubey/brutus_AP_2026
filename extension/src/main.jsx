// main.jsx — Mounts the Dashboard React application into the DOM.
// This is the entry point for index.html (the full-page dashboard tab).

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
);
