import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { criticalResourcePreloader } from './utils/criticalResourcePreloader';

const root = ReactDOM.createRoot(document.getElementById('root'));

// Preload critical resources immediately for instant table loading
criticalResourcePreloader.preloadCriticalResources();

// Clean up old preloaded data
criticalResourcePreloader.clearOldPreloadedData();

// Enable concurrent features for better performance
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
