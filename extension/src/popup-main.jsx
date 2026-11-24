// popup-main.jsx — Mounts the Popup React application into the DOM.
// This is the entry point for popup.html (the Chrome extension popup).

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';
import Popup from './popup/Popup.jsx';

createRoot(document.getElementById('popup-root')).render(
  <StrictMode>
    <Popup />
  </StrictMode>
);
