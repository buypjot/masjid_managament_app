import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import './theme-fixes.css';
import './dashboard-responsive.css';
import './dashboard-scroll-fix.css';
import './font-size-overrides.css';
import './sidebar-menu-typography.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
