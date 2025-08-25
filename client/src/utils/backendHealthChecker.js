// Backend Health Checker with Fallback to Mock Mode
class BackendHealthChecker {
  constructor() {
    this.isBackendHealthy = true;
    this.lastHealthCheck = 0;
    this.healthCheckInterval = 30000; // 30 seconds
    this.failureCount = 0;
    this.maxFailures = 3;
    this.backendUrl = process.env.NODE_ENV === 'production' 
      ? 'https://food-zone-backend-l00k.onrender.com' 
      : 'http://localhost:5001';
  }

  async checkBackendHealth() {
    const now = Date.now();
    
    // Skip if recently checked
    if (now - this.lastHealthCheck < this.healthCheckInterval) {
      return this.isBackendHealthy;
    }
    
    this.lastHealthCheck = now;
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
      
      const response = await fetch(`${this.backendUrl}/api/health`, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        this.isBackendHealthy = true;
        this.failureCount = 0;
        console.log('✅ Backend is healthy');
        return true;
      } else {
        throw new Error(`Backend returned ${response.status}`);
      }
    } catch (error) {
      this.failureCount++;
      console.warn(`⚠️ Backend health check failed (${this.failureCount}/${this.maxFailures}):`, error.message);
      
      if (this.failureCount >= this.maxFailures) {
        this.isBackendHealthy = false;
        console.error('❌ Backend is unhealthy, switching to mock mode');
        this.showBackendDownNotification();
      }
      
      return this.isBackendHealthy;
    }
  }

  showBackendDownNotification() {
    // Create a toast notification
    const notification = document.createElement('div');
    notification.className = 'fixed top-4 right-4 bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded-lg shadow-lg z-50';
    notification.innerHTML = `
      <div class="flex items-center">
        <svg class="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"></path>
        </svg>
        <div>
          <p class="font-medium">Backend Temporarily Unavailable</p>
          <p class="text-sm">Orders will be processed when connection is restored</p>
        </div>
      </div>
    `;
    
    document.body.appendChild(notification);
    
    // Auto-remove after 10 seconds
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 10000);
  }

  // Force mock mode when backend is down
  shouldUseMockMode() {
    return !this.isBackendHealthy || 
           process.env.NODE_ENV === 'development' || 
           window.location.hostname === 'localhost';
  }

  // Get backend status for UI display
  getBackendStatus() {
    return {
      isHealthy: this.isBackendHealthy,
      failureCount: this.failureCount,
      lastCheck: this.lastHealthCheck,
      nextCheck: this.lastHealthCheck + this.healthCheckInterval
    };
  }

  // Reset health status (for manual retry)
  resetHealth() {
    this.isBackendHealthy = true;
    this.failureCount = 0;
    this.lastHealthCheck = 0;
    console.log('🔄 Backend health status reset');
  }
}

// Create global instance
const backendHealthChecker = new BackendHealthChecker();

// Start periodic health checks
setInterval(() => {
  backendHealthChecker.checkBackendHealth();
}, backendHealthChecker.healthCheckInterval);

export default backendHealthChecker;
export { BackendHealthChecker };
