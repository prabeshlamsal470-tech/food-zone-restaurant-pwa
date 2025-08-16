// Food Zone PWA Service Worker - Enhanced for Background Audio & Notifications
const CACHE_NAME = 'food-zone-admin-v2';
const urlsToCache = [
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
  console.log('✅ Service Worker activated');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim(); // Take control immediately
});

// Fetch event
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Return cached version or fetch from network
        return response || fetch(event.request);
      }
    )
  );
});

// Background sync for offline functionality
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    console.log('🔄 Background sync triggered');
    event.waitUntil(doBackgroundSync());
  }
});

// Push notifications for background alerts
self.addEventListener('push', (event) => {
  console.log('📨 Push notification received');
  
  if (event.data) {
    const data = event.data.json();
    const options = {
      body: data.body,
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      vibrate: [200, 100, 200, 100, 200],
      requireInteraction: true,
      actions: [
        {
          action: 'view',
          title: 'View Order'
        }
      ]
    };

    event.waitUntil(
      self.registration.showNotification(data.title, options)
    );
  }
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('🔔 Notification clicked');
  event.notification.close();

  if (event.action === 'view') {
    event.waitUntil(
      clients.openWindow('/admin')
    );
  }
});

// Keep service worker alive for background processing
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'KEEP_ALIVE') {
    console.log('💓 Service Worker keep-alive ping');
    event.ports[0].postMessage({ status: 'alive' });
  }
  
  if (event.data && event.data.type === 'NEW_ORDER') {
    console.log('🔔 New order notification via service worker');
    
    // Show notification even when app is in background
    const options = {
      body: `New ${event.data.orderType} order received`,
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      vibrate: [200, 100, 200, 100, 200],
      requireInteraction: true,
      silent: false
    };

    self.registration.showNotification('🍽️ Food Zone - New Order!', options);
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
