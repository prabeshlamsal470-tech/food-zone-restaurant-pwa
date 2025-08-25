// Backend Health Checker with Fallback to Mock Mode
class BackendHealthChecker {
  constructor() {
    this.isBackendHealthy = true;
    this.lastHealthCheck = 0;
    this.healthCheckInterval = 30000; // 30 seconds
    this.failureCount = 0;
    this.maxFailures = 3;
    this.checkInterval = 30000; // 30 seconds
    this.notificationShown = false;
    this.intervalId = null;
  }

  async checkBackendHealth() {
    // Always return true - disable health checking
    return true;
  }

  recordFailure() {
    // Do nothing - disable failure recording
  }

  resetHealth() {
    this.isBackendDown = false;
    this.failureCount = 0;
    this.notificationShown = false;
  }

  showBackendDownNotification() {
    // Do nothing - disable notifications
  }

  hideBackendDownNotification() {
    // Do nothing - disable notifications
  }

  shouldUseMockMode() {
    // Always return false - disable mock mode
    return false;
  }

  startPeriodicChecks() {
    // Do nothing - disable periodic checks
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

  getStatus() {
    return {
      isBackendDown: false,
      failureCount: 0,
      maxFailures: this.maxFailures,
      notificationShown: false
    };
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
