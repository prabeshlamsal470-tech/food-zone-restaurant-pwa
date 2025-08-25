// Chunk Loading Error Handler for Instant Recovery
class ChunkErrorHandler {
  constructor() {
    this.retryAttempts = new Map();
    this.maxRetries = 3;
    this.retryDelay = 1000; // 1 second
    this.setupGlobalErrorHandler();
  }

  setupGlobalErrorHandler() {
    // Handle chunk loading errors globally
    window.addEventListener('error', (event) => {
      if (event.message && event.message.includes('ChunkLoadError')) {
        this.handleChunkError(event);
      }
    });

    // Handle unhandled promise rejections (chunk loading failures)
    window.addEventListener('unhandledrejection', (event) => {
      if (event.reason && event.reason.name === 'ChunkLoadError') {
        this.handleChunkError(event);
      }
    });
  }

  handleChunkError(event) {
    const chunkName = this.extractChunkName(event);
    console.warn(`🔄 Chunk loading failed: ${chunkName}. Attempting recovery...`);
    
    // Prevent default error handling
    event.preventDefault();
    
    // Try to recover
    this.retryChunkLoad(chunkName);
  }

  extractChunkName(event) {
    const error = event.error || event.reason;
    const message = error?.message || event.message || '';
    
    // Extract chunk name from error message
    const chunkMatch = message.match(/Loading chunk (\d+) failed/);
    if (chunkMatch) {
      return `chunk-${chunkMatch[1]}`;
    }
    
    // Extract from filename
    const fileMatch = message.match(/([^/]+\.chunk\.js)/);
    if (fileMatch) {
      return fileMatch[1];
    }
    
    return 'unknown-chunk';
  }

  async retryChunkLoad(chunkName) {
    const attempts = this.retryAttempts.get(chunkName) || 0;
    
    if (attempts >= this.maxRetries) {
      console.error(`❌ Max retries exceeded for ${chunkName}. Falling back to direct import.`);
      this.fallbackToDirectImport();
      return;
    }
    
    this.retryAttempts.set(chunkName, attempts + 1);
    
    // Wait before retry
    await new Promise(resolve => setTimeout(resolve, this.retryDelay * (attempts + 1)));
    
    try {
      // Clear webpack cache
      if (window.__webpack_require__ && window.__webpack_require__.cache) {
        Object.keys(window.__webpack_require__.cache).forEach(key => {
          if (key.includes(chunkName)) {
            delete window.__webpack_require__.cache[key];
          }
        });
      }
      
      // Force page reload as last resort
      if (attempts === this.maxRetries - 1) {
        console.warn(`🔄 Final attempt failed. Reloading page...`);
        window.location.reload();
      }
      
    } catch (error) {
      console.error(`Retry ${attempts + 1} failed for ${chunkName}:`, error);
      this.retryChunkLoad(chunkName);
    }
  }

  fallbackToDirectImport() {
    // Fallback: force page reload to clear chunk cache
    const currentPath = window.location.pathname;
    
    console.warn(`🔄 Chunk loading failed on ${currentPath}. Forcing page reload...`);
    
    // Clear all caches before reload
    if ('caches' in window) {
      caches.keys().then(names => {
        names.forEach(name => {
          caches.delete(name);
        });
      });
    }
    
    // Force hard reload
    window.location.reload(true);
  }

  showFallbackMenu() {
    // Create a simple fallback menu interface
    const fallbackHTML = `
      <div style="min-height: 100vh; padding: 20px; background: #f9fafb;">
        <div style="max-width: 800px; margin: 0 auto; text-align: center;">
          <h1 style="color: #d97706; margin-bottom: 20px;">Food Zone Menu</h1>
          <div style="background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <p style="margin-bottom: 15px;">Loading menu items...</p>
            <button onclick="window.location.reload()" style="background: #d97706; color: white; padding: 10px 20px; border: none; border-radius: 4px; cursor: pointer;">
              Refresh Menu
            </button>
          </div>
        </div>
      </div>
    `;
    
    document.body.innerHTML = fallbackHTML;
  }

  // Clear retry attempts for successful loads
  clearRetryAttempts(chunkName) {
    this.retryAttempts.delete(chunkName);
  }

  // Get retry statistics
  getRetryStats() {
    return {
      activeRetries: this.retryAttempts.size,
      retryAttempts: Object.fromEntries(this.retryAttempts)
    };
  }
}

// Initialize global chunk error handler
const chunkErrorHandler = new ChunkErrorHandler();

export default chunkErrorHandler;
export { ChunkErrorHandler };
