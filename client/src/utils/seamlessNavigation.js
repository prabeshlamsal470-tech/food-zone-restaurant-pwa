// Seamless navigation utilities for world-class table experience
import { tablePreloader } from './tablePreloader';

class SeamlessNavigation {
  constructor() {
    this.navigationCache = new Map();
    this.prefetchedRoutes = new Set();
    this.isNavigating = false;
  }

  // Instant navigation with zero loading time
  async navigateToTable(tableNumber, navigate, setTableContext) {
    if (this.isNavigating) return;
    this.isNavigating = true;

    try {
      // Get preloaded data instantly
      const preloadedData = tablePreloader.getPreloadedData(tableNumber);
      
      if (preloadedData && tablePreloader.isDataFresh(tableNumber)) {
        // Instant navigation with cached data
        this.performInstantNavigation(tableNumber, preloadedData, navigate, setTableContext);
      } else {
        // Show instant placeholder while loading
        this.showInstantPlaceholder(tableNumber, navigate, setTableContext);
        
        // Load data in background
        const data = await tablePreloader.preloadTableData(tableNumber);
        this.updateWithRealData(data);
      }
    } catch (error) {
      console.error('Navigation error:', error);
      // Fallback to instant mock data
      this.performInstantNavigation(tableNumber, { menu: tablePreloader.getFallbackMenu() }, navigate, setTableContext);
    } finally {
      this.isNavigating = false;
    }
  }

  // Perform instant navigation with zero delay
  performInstantNavigation(tableNumber, data, navigate, setTableContext) {
    // Set table context immediately
    setTableContext(tableNumber);
    
    // Store navigation data for instant access
    this.navigationCache.set(`table_${tableNumber}`, data);
    
    // Navigate instantly - no loading screens
    const tableUrl = this.getEncryptedTableUrl(tableNumber);
    navigate(tableUrl, { replace: false });
    
    // Trigger instant data population
    this.populateTableData(tableNumber, data);
  }

  // Show instant placeholder content
  showInstantPlaceholder(tableNumber, navigate, setTableContext) {
    const mockData = {
      menu: tablePreloader.getFallbackMenu(),
      tableStatus: { available: true }
    };
    
    this.performInstantNavigation(tableNumber, mockData, navigate, setTableContext);
  }

  // Update with real data seamlessly
  updateWithRealData(data) {
    // Smoothly update UI with real data
    const event = new CustomEvent('tableDataUpdate', { detail: data });
    window.dispatchEvent(event);
  }

  // Get encrypted table URL for secure navigation
  getEncryptedTableUrl(tableNumber) {
    // Use stored encrypted URLs from localStorage
    const storedUrl = localStorage.getItem(`encryptedTable_${tableNumber}`);
    if (storedUrl) return storedUrl;
    
    // Fallback to table number (will be handled by encryption)
    return `/${tableNumber}`;
  }

  // Populate table data instantly
  populateTableData(tableNumber, data) {
    const event = new CustomEvent('populateTableData', {
      detail: { tableNumber, data }
    });
    window.dispatchEvent(event);
  }

  // Prefetch next likely tables for predictive loading
  async prefetchLikelyTables(currentTable) {
    const likelyTables = this.getLikelyNextTables(currentTable);
    
    // Prefetch in background without blocking
    setTimeout(() => {
      tablePreloader.preloadMultipleTables(likelyTables);
    }, 100);
  }

  // Get likely next tables based on patterns
  getLikelyNextTables(currentTable) {
    const nearby = [];
    const tableNum = parseInt(currentTable);
    
    // Add nearby tables (±2 range)
    for (let i = Math.max(1, tableNum - 2); i <= Math.min(25, tableNum + 2); i++) {
      if (i !== tableNum) nearby.push(i);
    }
    
    // Add popular tables (1, 5, 10, 15, 20)
    const popular = [1, 5, 10, 15, 20].filter(t => t !== tableNum);
    
    return [...nearby, ...popular].slice(0, 5); // Limit to 5 tables
  }

  // Preload menu page for instant table-to-menu navigation
  async preloadMenuPage() {
    if (this.prefetchedRoutes.has('menu')) return;
    
    try {
      // Preload menu component and data
      const menuData = await tablePreloader.preloadMenu();
      
      // Cache menu data for instant access
      localStorage.setItem('preloadedMenu', JSON.stringify({
        data: menuData,
        timestamp: Date.now()
      }));
      
      this.prefetchedRoutes.add('menu');
    } catch (error) {
      console.error('Menu preload error:', error);
    }
  }

  // Navigate to menu instantly from table
  navigateToMenuInstantly(navigate, tableNumber) {
    // Set table parameter for menu context
    const menuUrl = `/menu?table=${tableNumber}`;
    
    // Navigate instantly - no loading
    navigate(menuUrl, { replace: false });
    
    // Trigger instant menu population
    const event = new CustomEvent('populateMenuInstantly', {
      detail: { tableNumber }
    });
    window.dispatchEvent(event);
  }

  // Clear navigation cache
  clearCache() {
    this.navigationCache.clear();
    this.prefetchedRoutes.clear();
  }

  // Get cached navigation data
  getCachedData(tableNumber) {
    return this.navigationCache.get(`table_${tableNumber}`);
  }
}

// Export singleton instance
export const seamlessNavigation = new SeamlessNavigation();
export default seamlessNavigation;
