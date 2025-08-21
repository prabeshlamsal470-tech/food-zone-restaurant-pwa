// Food Zone PWA Service Worker - Enhanced for Staff Dashboard
const CACHE_NAME = 'food-zone-staff-v3';
const urlsToCache = [
  '/staff',
  '/admin',
  '/static/js/bundle.js',
  '/static/css/main.css',
  '/images/Food Zone Restaurant Logo.jpg',
  '/manifest.json',
  '/sounds/table-order.mp3',
  '/sounds/delivery-order.mp3'
];

// Install Service Worker
self.addEventListener('install', (event) => {
  console.log('🔧 Service Worker installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(urlsToCache);
      })
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

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        if (response) {
          return response;
        }
        return fetch(event.request);
      }
    )
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
