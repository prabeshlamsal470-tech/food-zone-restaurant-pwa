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
