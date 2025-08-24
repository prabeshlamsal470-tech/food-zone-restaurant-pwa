// Table experience preloader for instant, seamless navigation
import { apiService } from '../services/apiService';

class TablePreloader {
  constructor() {
    this.preloadedData = new Map();
    this.preloadPromises = new Map();
    this.isPreloading = false;
  }

  // Preload critical table data instantly
  async preloadTableData(tableNumber) {
    const cacheKey = `table_${tableNumber}`;
    
    // Return cached data if available
    if (this.preloadedData.has(cacheKey)) {
      return this.preloadedData.get(cacheKey);
    }

    // Return existing promise if already preloading
    if (this.preloadPromises.has(cacheKey)) {
      return this.preloadPromises.get(cacheKey);
    }

    // Start preloading
    const preloadPromise = this.loadTableData(tableNumber);
    this.preloadPromises.set(cacheKey, preloadPromise);

    try {
      const data = await preloadPromise;
      this.preloadedData.set(cacheKey, data);
      this.preloadPromises.delete(cacheKey);
      return data;
    } catch (error) {
      this.preloadPromises.delete(cacheKey);
      throw error;
    }
  }

  // Load all critical table data in parallel
  async loadTableData(tableNumber) {
    const [menuData, tableStatus] = await Promise.allSettled([
      this.preloadMenu(),
      this.preloadTableStatus(tableNumber)
    ]);

    return {
      menu: menuData.status === 'fulfilled' ? menuData.value : this.getFallbackMenu(),
      tableStatus: tableStatus.status === 'fulfilled' ? tableStatus.value : { available: true },
      timestamp: Date.now()
    };
  }

  // Preload menu with instant fallback
  async preloadMenu() {
    try {
      const response = await apiService.fetchApi.get('/api/menu');
      return Array.isArray(response) ? response : (response.data || []);
    } catch (error) {
      return this.getFallbackMenu();
    }
  }

  // Preload table status
  async preloadTableStatus(tableNumber) {
    try {
      const response = await apiService.fetchApi.get(`/api/tables/${tableNumber}/status`);
      return response;
    } catch (error) {
      return { available: true, orders: [] };
    }
  }

  // Instant fallback menu for seamless experience
  getFallbackMenu() {
    const now = new Date();
    const currentHour = now.getHours();
    const isHappyHour = currentHour >= 11 && currentHour < 14;

    let menu = [
      { id: 1, name: 'Chicken Momo', price: 180, category: 'Appetizers', description: 'Steamed chicken dumplings', image: '/images/chicken-momo.jpg' },
      { id: 2, name: 'Chicken Thali', price: 350, category: 'Main Course', description: 'Complete chicken meal set', image: '/images/chicken-thali.jpg' },
      { id: 3, name: 'Burger Combo', price: 280, category: 'Fast Food', description: 'Burger with fries and drink', image: '/images/burger-combo.jpg' },
      { id: 4, name: 'Cheese Pizza', price: 450, category: 'Pizza', description: 'Classic cheese pizza', image: '/images/cheese-pizza.jpg' },
      { id: 5, name: 'Fried Rice', price: 220, category: 'Main Course', description: 'Chicken fried rice', image: '/images/fried-rice.jpg' },
      { id: 6, name: 'Veg Momo', price: 150, category: 'Appetizers', description: 'Steamed vegetable dumplings', image: '/images/veg-momo.jpg' },
      { id: 7, name: 'Chicken Chowmein', price: 180, category: 'Noodles', description: 'Stir-fried noodles with chicken', image: '/images/chicken-chowmein.jpg' },
      { id: 8, name: 'Veg Burger', price: 200, category: 'Fast Food', description: 'Vegetarian burger with fries', image: '/images/veg-burger.jpg' },
      { id: 9, name: 'Dal Bhat', price: 180, category: 'Traditional', description: 'Traditional Nepali meal', image: '/images/dal-bhat.jpg' },
      { id: 10, name: 'Chicken Curry', price: 280, category: 'Main Course', description: 'Spicy chicken curry', image: '/images/chicken-curry.jpg' }
    ];

    // Add happy hour items if applicable
    if (isHappyHour) {
      const happyHourItems = [
        { id: 101, name: 'Happy Hour Special Momo', price: 120, category: 'Happy Hour', description: 'Discounted chicken momo (11 AM - 2 PM)', image: '/images/happy-momo.jpg' },
        { id: 102, name: 'Happy Hour Chowmein', price: 140, category: 'Happy Hour', description: 'Discounted chicken chowmein (11 AM - 2 PM)', image: '/images/happy-chowmein.jpg' },
        { id: 103, name: 'Happy Hour Burger', price: 180, category: 'Happy Hour', description: 'Discounted burger combo (11 AM - 2 PM)', image: '/images/happy-burger.jpg' }
      ];
      menu = [...menu, ...happyHourItems];
    }

    return menu;
  }

  // Get preloaded data instantly
  getPreloadedData(tableNumber) {
    const cacheKey = `table_${tableNumber}`;
    return this.preloadedData.get(cacheKey);
  }

  // Preload multiple tables for predictive loading
  async preloadMultipleTables(tableNumbers) {
    const promises = tableNumbers.map(num => this.preloadTableData(num));
    await Promise.allSettled(promises);
  }

  // Clear old cache data
  clearCache() {
    this.preloadedData.clear();
    this.preloadPromises.clear();
  }

  // Check if data is fresh (less than 2 minutes old)
  isDataFresh(tableNumber) {
    const data = this.getPreloadedData(tableNumber);
    if (!data) return false;
    return (Date.now() - data.timestamp) < 120000; // 2 minutes
  }
}

// Export singleton instance
export const tablePreloader = new TablePreloader();
export default tablePreloader;
