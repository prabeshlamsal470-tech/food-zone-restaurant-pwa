// Bundle Optimization for Ultra-Fast Table Loading
import { lazy } from 'react';

// Critical components that should load immediately
export const CRITICAL_COMPONENTS = {
  TableOrder: lazy(() => import('../pages/TableOrder')),
  Menu: lazy(() => import('../pages/Menu')),
  Header: lazy(() => import('../components/Header')),
  FloatingCart: lazy(() => import('../components/FloatingCart'))
};

// Non-critical components that can load later
export const NON_CRITICAL_COMPONENTS = {
  Admin: lazy(() => import('../pages/Admin')),
  StaffDashboard: lazy(() => import('../pages/StaffDashboard')),
  Reception: lazy(() => import('../pages/Reception')),
  DeliveryCart: lazy(() => import('../pages/DeliveryCart'))
};

// Preload critical table components
export const preloadTableComponents = () => {
  // Preload TableOrder component immediately
  CRITICAL_COMPONENTS.TableOrder.preload?.();
  
  // Preload Menu component after a short delay
  setTimeout(() => {
    CRITICAL_COMPONENTS.Menu.preload?.();
  }, 100);
  
  // Preload Header and FloatingCart after TableOrder
  setTimeout(() => {
    CRITICAL_COMPONENTS.Header.preload?.();
    CRITICAL_COMPONENTS.FloatingCart.preload?.();
  }, 200);
};

// Preload non-critical components in background
export const preloadNonCriticalComponents = () => {
  // Preload after 2 seconds to not interfere with table loading
  setTimeout(() => {
    Object.values(NON_CRITICAL_COMPONENTS).forEach((component, index) => {
      setTimeout(() => {
        component.preload?.();
      }, index * 500); // Stagger loading
    });
  }, 2000);
};

// Resource hints for faster loading
export const addResourceHints = () => {
  // Add DNS prefetch for backend
  const dnsPrefetch = document.createElement('link');
  dnsPrefetch.rel = 'dns-prefetch';
  dnsPrefetch.href = 'https://food-zone-backend-l00k.onrender.com';
  document.head.appendChild(dnsPrefetch);
  
  // Add preconnect for backend API
  const preconnect = document.createElement('link');
  preconnect.rel = 'preconnect';
  preconnect.href = 'https://food-zone-backend-l00k.onrender.com';
  preconnect.crossOrigin = 'anonymous';
  document.head.appendChild(preconnect);
  
  // Prefetch critical API endpoints
  const criticalEndpoints = ['/api/menu', '/api/tables/status'];
  criticalEndpoints.forEach(endpoint => {
    const prefetch = document.createElement('link');
    prefetch.rel = 'prefetch';
    prefetch.href = `https://food-zone-backend-l00k.onrender.com${endpoint}`;
    document.head.appendChild(prefetch);
  });
};

// Initialize bundle optimizations
export const initializeBundleOptimizations = () => {
  // Add resource hints immediately
  addResourceHints();
  
  // Preload critical components
  preloadTableComponents();
  
  // Preload non-critical components in background
  preloadNonCriticalComponents();
  
  console.log('🚀 Bundle optimizations initialized for instant table loading');
};

export default {
  CRITICAL_COMPONENTS,
  NON_CRITICAL_COMPONENTS,
  preloadTableComponents,
  preloadNonCriticalComponents,
  addResourceHints,
  initializeBundleOptimizations
};
