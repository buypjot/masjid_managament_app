import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import './theme-fixes.css';
import './dashboard-scroll-fix.css';
import './font-size-overrides.css';
import './sidebar-menu-typography.css';
import './dashboard-reference.css';
import './dashboard-reference-fix.css';
import './dashboard-reference-final.css';
import './dashboard-responsive.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
