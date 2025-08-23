import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
// import reportWebVitals from './reportWebVitals';
import { preloadCriticalResources } from './utils/performanceOptimizer';

const root = ReactDOM.createRoot(document.getElementById('root'));

// Preload critical resources for faster loading
preloadCriticalResources();

root.render(
  <App />
);
