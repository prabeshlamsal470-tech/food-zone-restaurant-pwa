// Enhanced Backend Health Checker with Auto-Wake for Render
class BackendHealthChecker {
  constructor() {
    this.isBackendHealthy = false;
    this.lastHealthCheck = 0;
    this.healthCheckInterval = 15000; // 15 seconds
    this.failureCount = 0;
    this.maxFailures = 5;
    this.checkInterval = 15000; // 15 seconds
    this.notificationShown = false;
    this.intervalId = null;
    this.wakeAttempts = 0;
    this.maxWakeAttempts = 3;
    this.isWaking = false;
    this.backendUrl = process.env.NODE_ENV === 'production' 
      ? 'https://food-zone-backend-l00k.onrender.com'
      : 'http://localhost:5001';
    this.startPeriodicChecks();
  }

  async checkBackendHealth() {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout for cold starts
      
      const response = await fetch(`${this.backendUrl}/api/menu`, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data) && data.length > 0) {
          this.resetHealth();
          return true;
        }
      }
      
      throw new Error(`Backend unhealthy: ${response.status}`);
      
    } catch (error) {
      console.warn('🔴 Backend health check failed:', error.message);
      this.recordFailure();
      
      // Try to wake up the backend if it's hibernated
      if (!this.isWaking && this.wakeAttempts < this.maxWakeAttempts) {
        await this.wakeBackend();
      }
      
      return false;
    }
  }

  recordFailure() {
    this.failureCount++;
    this.isBackendHealthy = false;
    
    if (this.failureCount >= this.maxFailures && !this.notificationShown) {
      this.showBackendDownNotification();
    }
  }

  resetHealth() {
    this.isBackendHealthy = true;
    this.failureCount = 0;
    this.wakeAttempts = 0;
    this.isWaking = false;
    this.notificationShown = false;
    this.hideBackendDownNotification();
    console.log('✅ Backend health restored');
  }

  showBackendDownNotification() {
    if (this.notificationShown) return;
    
    this.notificationShown = true;
    const notification = document.createElement('div');
    notification.id = 'backend-down-notification';
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: linear-gradient(135deg, #ef4444, #dc2626);
      color: white;
      padding: 16px 20px;
      border-radius: 12px;
      box-shadow: 0 8px 16px rgba(0,0,0,0.2);
      z-index: 10000;
      font-family: system-ui, -apple-system, sans-serif;
      font-size: 14px;
      max-width: 350px;
    `;
    
    notification.innerHTML = `
      <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 8px;">
        <div style="width: 20px; height: 20px; border: 2px solid white; border-top: 2px solid transparent; border-radius: 50%; animation: spin 1s linear infinite;"></div>
        <strong>Connecting to Server...</strong>
      </div>
      <p style="margin: 0; opacity: 0.9; font-size: 13px;">Waking up backend service. This may take 30-60 seconds.</p>
    `;
    
    // Add CSS animation if not already present
    if (!document.getElementById('backend-animations')) {
      const style = document.createElement('style');
      style.id = 'backend-animations';
      style.textContent = '@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }';
      document.head.appendChild(style);
    }
    
    document.body.appendChild(notification);
  }

  hideBackendDownNotification() {
    const notification = document.getElementById('backend-down-notification');
    if (notification) {
      notification.remove();
    }
    this.notificationShown = false;
  }

  shouldUseMockMode() {
    return !this.isBackendHealthy && this.failureCount >= this.maxFailures;
  }

  startPeriodicChecks() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
    
    // Initial health check
    this.checkBackendHealth();
    
    // Set up periodic checks
    this.intervalId = setInterval(() => {
      this.checkBackendHealth();
    }, this.checkInterval);
    
    console.log('🔄 Backend health monitoring started');
  }

  stopPeriodicChecks() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  forceReset() {
    this.resetHealth();
  }

  async wakeBackend() {
    if (this.isWaking) return;
    
    this.isWaking = true;
    this.wakeAttempts++;
    
    console.log(`🔄 Attempting to wake backend (attempt ${this.wakeAttempts}/${this.maxWakeAttempts})...`);
    
    try {
      // Multiple wake-up requests to different endpoints
      const wakeEndpoints = [
        `${this.backendUrl}/`,
        `${this.backendUrl}/api/menu`,
        `${this.backendUrl}/api/health`
      ];
      
      const wakePromises = wakeEndpoints.map(async (endpoint) => {
        try {
          const controller = new AbortController();
          setTimeout(() => controller.abort(), 30000); // 30s timeout for wake
          
          await fetch(endpoint, {
            method: 'GET',
            signal: controller.signal,
            headers: { 'Cache-Control': 'no-cache' }
          });
        } catch (error) {
          // Ignore individual wake request failures
        }
      });
      
      await Promise.allSettled(wakePromises);
      
      // Wait a bit for the service to fully wake up
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      // Check if wake was successful
      const isAwake = await this.checkBackendHealth();
      if (isAwake) {
        console.log('✅ Backend successfully woken up');
      }
      
    } catch (error) {
      console.warn('Failed to wake backend:', error);
    } finally {
      this.isWaking = false;
    }
  }
  
  getStatus() {
    return {
      isBackendHealthy: this.isBackendHealthy,
      failureCount: this.failureCount,
      maxFailures: this.maxFailures,
      notificationShown: this.notificationShown,
      wakeAttempts: this.wakeAttempts,
      isWaking: this.isWaking
    };
  }
}

// Create global instance
const backendHealthChecker = new BackendHealthChecker();

// Expose to window for debugging
window.backendHealthChecker = backendHealthChecker;

export default backendHealthChecker;
export { BackendHealthChecker };
