// Food Zone PWA Service Worker - Enhanced for Instant Table Loading
const CACHE_NAME = 'food-zone-v2.0.0';
const API_CACHE = 'food-zone-api-v2';
const TABLE_CACHE = 'food-zone-table-v2';

// Critical resources for instant table loading
const urlsToCache = [
  '/',
  '/menu',
  '/static/js/bundle.js',
  '/static/css/main.css',
  '/manifest.json',
  '/images/logo.jpg',
  '/delivery-cart',
  '/reception',
  '/staff'
];

// API endpoints to aggressively cache for instant table experience
const CRITICAL_API_ENDPOINTS = [
  '/api/menu',
  '/api/tables/status',
  '/api/tables'
];

// Cache strategies
const CACHE_STRATEGIES = {
  // Cache first for static assets
  CACHE_FIRST: 'cache-first',
  // Network first for dynamic content
  NETWORK_FIRST: 'network-first',
  // Stale while revalidate for frequently updated content
  STALE_WHILE_REVALIDATE: 'stale-while-revalidate'
};

// Install Service Worker with aggressive table caching
self.addEventListener('install', (event) => {
  console.log('🔧 Service Worker installing with table optimizations...');
  event.waitUntil(
    Promise.all([
      // Cache static resources
      caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache)),
      // Pre-cache critical API endpoints for instant table loading
      caches.open(API_CACHE).then(cache => {
        return Promise.all(
          CRITICAL_API_ENDPOINTS.map(endpoint => {
            return fetch(`https://food-zone-backend-l00k.onrender.com${endpoint}`)
              .then(response => {
                if (response.ok) {
                  cache.put(endpoint, response.clone());
                  console.log(`✅ Pre-cached ${endpoint}`);
                }
                return response;
              })
              .catch(error => {
                console.log(`⚠️ Failed to pre-cache ${endpoint}:`, error);
              });
          })
        );
      }),
      // Pre-cache table encryption utilities
      caches.open(TABLE_CACHE).then(cache => {
        const tableData = {
          fallbackMenu: [
            { id: 1, name: 'Chicken Momo', price: 180, category: 'Appetizers' },
            { id: 2, name: 'Chicken Thali', price: 350, category: 'Main Course' },
            { id: 3, name: 'Burger Combo', price: 280, category: 'Fast Food' },
            { id: 4, name: 'Cheese Pizza', price: 450, category: 'Pizza' },
            { id: 5, name: 'Fried Rice', price: 220, category: 'Main Course' }
          ],
          timestamp: Date.now()
        };
        return cache.put('/fallback-menu', new Response(JSON.stringify(tableData)));
      })
    ])
  );
  self.skipWaiting(); // Activate immediately
});

// Activate event
self.addEventListener('activate', (event) => {
  console.log('🚀 Service Worker activated for kitchen operations');
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      setupBackgroundSync(),
      startKeepAlive()
    ])
  );
});

// Setup background sync for persistent connectivity
async function setupBackgroundSync() {
  try {
    if ('sync' in self.registration) {
      await self.registration.sync.register('kitchen-orders-sync');
      backgroundSyncRegistered = true;
      console.log('📡 Background sync registered for kitchen orders');
    }
  } catch (error) {
    console.warn('Background sync not supported:', error);
  }
}

// Keep-alive mechanism for kitchen staff
function startKeepAlive() {
  if (keepAliveInterval) clearInterval(keepAliveInterval);
  
  keepAliveInterval = setInterval(() => {
    // Ping to maintain connection awareness
    self.clients.matchAll().then(clients => {
      clients.forEach(client => {
        client.postMessage({
          type: 'KEEP_ALIVE_PING',
          timestamp: Date.now()
        });
      });
    });
  }, 30000); // Every 30 seconds
  
  console.log('⏰ Keep-alive mechanism started for kitchen staff');
}

// Enhanced fetch handler for instant table loading
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // Handle API requests with cache-first strategy for instant loading
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      caches.open(API_CACHE).then(cache => {
        return cache.match(event.request).then(cachedResponse => {
          if (cachedResponse) {
            // Return cached response immediately for instant loading
            const response = cachedResponse.clone();
            
            // Update cache in background without blocking
            fetch(event.request).then(networkResponse => {
              if (networkResponse && networkResponse.ok) {
                cache.put(event.request, networkResponse.clone());
              }
            }).catch(() => {
              // Network failed, cached response is still valid
            });
            
            return response;
          }
          
          // No cache, fetch from network and cache
          return fetch(event.request).then(networkResponse => {
            if (networkResponse && networkResponse.ok) {
              cache.put(event.request, networkResponse.clone());
            }
            return networkResponse;
          }).catch(() => {
            // Return fallback menu for critical endpoints
            if (url.pathname === '/api/menu') {
              return caches.open(TABLE_CACHE).then(tableCache => {
                return tableCache.match('/fallback-menu');
              });
            }
            throw new Error('Network unavailable');
          });
        });
      })
    );
    return;
  }
  
  // Handle static resources with cache-first for instant loading
  event.respondWith(
    caches.match(event.request).then(response => {
      if (response) {
        return response;
      }
      return fetch(event.request).then(networkResponse => {
        // Cache successful responses for future instant loading
        if (networkResponse && networkResponse.ok && networkResponse.type === 'basic') {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      });
    })
  );
});

// Background sync for kitchen operations
self.addEventListener('sync', (event) => {
  if (event.tag === 'kitchen-orders-sync') {
    console.log('🔄 Kitchen orders background sync triggered');
    event.waitUntil(syncKitchenOrders());
  }
});

// Background sync function for kitchen orders
async function syncKitchenOrders() {
  try {
    console.log('📡 Syncing kitchen orders in background...');
    
    // Attempt to reconnect to backend for order updates
    const response = await fetch('https://food-zone-backend-l00k.onrender.com/api/orders/today');
    if (response.ok) {
      const orders = await response.json();
      
      // Notify all clients about updated orders
      const clients = await self.clients.matchAll();
      clients.forEach(client => {
        client.postMessage({
          type: 'BACKGROUND_ORDERS_UPDATE',
          orders: orders
        });
      });
      
      console.log('✅ Kitchen orders synced successfully');
    }
  } catch (error) {
    console.error('❌ Kitchen orders sync failed:', error);
    // Retry sync after delay
    setTimeout(() => {
      self.registration.sync.register('kitchen-orders-sync');
    }, 60000); // Retry after 1 minute
  }
}

// Enhanced audio alert function for service worker
function playTripleBellAlert() {
  try {
    // Create audio context in service worker
    const audioContext = new (self.AudioContext || self.webkitAudioContext)();
    
    // Play 3 bell sounds with different frequencies
    const frequencies = [800, 1000, 800];
    const interval = 0.8;

    for (let i = 0; i < 3; i++) {
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      const filterNode = audioContext.createBiquadFilter();

      oscillator.connect(filterNode);
      filterNode.connect(gainNode);
      gainNode.connect(audioContext.destination);

      // Configure bell sound
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(frequencies[i], audioContext.currentTime + (i * interval));
      oscillator.frequency.exponentialRampToValueAtTime(frequencies[i] * 0.5, audioContext.currentTime + (i * interval) + 0.6);

      // Add filter for bell-like resonance
      filterNode.type = 'bandpass';
      filterNode.frequency.setValueAtTime(frequencies[i], audioContext.currentTime + (i * interval));
      filterNode.Q.setValueAtTime(10, audioContext.currentTime + (i * interval));

      // Volume envelope (loud start, quick fade)
      gainNode.gain.setValueAtTime(0, audioContext.currentTime + (i * interval));
      gainNode.gain.linearRampToValueAtTime(0.9, audioContext.currentTime + (i * interval) + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.1, audioContext.currentTime + (i * interval) + 0.2);
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + (i * interval) + 0.6);

      oscillator.start(audioContext.currentTime + (i * interval));
      oscillator.stop(audioContext.currentTime + (i * interval) + 0.6);
    }
  } catch (error) {
    console.warn('Service worker audio alert failed:', error);
  }
}

// Handle push events for background notifications
self.addEventListener('push', function(event) {
  console.log('Push event received:', event);
  
  let notificationData = {
    title: '🍽️ Food Zone - New Order!',
    body: 'You have a new order',
    icon: '/icon-192x192.png',
    badge: '/icon-192x192.png',
    vibrate: [400, 200, 400, 200, 400, 200, 400], // Extended vibration
    requireInteraction: true,
    silent: false,
    tag: 'food-zone-order',
    renotify: true,
    actions: [
      { action: 'view', title: 'View Order' },
      { action: 'dismiss', title: 'Dismiss' }
    ]
  };

  if (event.data) {
    try {
      const data = event.data.json();
      notificationData.title = data.title || notificationData.title;
      notificationData.body = data.body || notificationData.body;
    } catch (e) {
      console.log('Could not parse push data:', e);
    }
  }

  // Play triple bell alert for background notifications
  playTripleBellAlert();

  event.waitUntil(
    self.registration.showNotification(notificationData.title, {
      body: notificationData.body,
      icon: notificationData.icon,
      badge: notificationData.badge,
      vibrate: notificationData.vibrate,
      requireInteraction: notificationData.requireInteraction,
      silent: notificationData.silent,
      tag: notificationData.tag,
      renotify: notificationData.renotify,
      actions: notificationData.actions
    })
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('🔔 Notification clicked');
  event.notification.close();

  if (event.action === 'view') {
    event.waitUntil(
      clients.openWindow('/staff')
    );
  }
});

// Handle messages from main thread
self.addEventListener('message', (event) => {
  console.log('🔔 Service worker received message:', event.data);
  
  if (event.data && event.data.type === 'NEW_ORDER') {
    const { orderType, tableId, totalAmount, orderInfo } = event.data;
    const displayInfo = orderInfo || (orderType === 'dine-in' ? `Table ${tableId}` : 'Delivery');
    
    // Play triple bell alert for background notifications
    playTripleBellAlert();
    
    // Show persistent notification for lock screen
    self.registration.showNotification('🍽️ Food Zone - New Order!', {
      body: `${displayInfo} - NPR ${totalAmount || 'N/A'}`,
      icon: '/icon-192x192.png',
      badge: '/icon-192x192.png',
      vibrate: [400, 200, 400, 200, 400, 200, 400],
      requireInteraction: true,
      silent: false,
      tag: 'food-zone-order-' + Date.now(),
      renotify: true,
      actions: [
        { action: 'view', title: 'View Order' },
        { action: 'dismiss', title: 'Dismiss' }
      ]
    });
  }
});

// Background sync function
async function doBackgroundSync() {
  try {
    // Keep connection alive with server
    const response = await fetch('/api/orders');
    if (response.ok) {
      console.log('🔄 Background sync successful');
    }
  } catch (error) {
    console.error('❌ Background sync failed:', error);
  }
}

// Periodic background sync to keep PWA active
setInterval(() => {
  console.log('💓 Service Worker heartbeat');
}, 30000); // Every 30 seconds
