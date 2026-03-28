// Service Worker pour Warrior Habit Tracker

// --- FIREBASE CLOUD MESSAGING (background) ---
importScripts('https://www.gstatic.com/firebasejs/9.17.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.17.1/firebase-messaging-compat.js');

firebase.initializeApp({
    apiKey: "AIzaSyAS0RofOjkTjaDjYhlLc1wISqCgozDOjNY",
    authDomain: "warrior-habit-tracker.firebaseapp.com",
    projectId: "warrior-habit-tracker",
    storageBucket: "warrior-habit-tracker.appspot.com",
    messagingSenderId: "986537173596",
    appId: "1:986537173596:web:1ba2b4ec5e8991def47c99"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
    const { title, body, icon } = payload.notification || {};
    if (title) {
        self.registration.showNotification(title, {
            body: body || '',
            icon: icon || './icons/icon-192.png',
            badge: './icons/icon-192.png',
            vibrate: [100, 50, 100],
            data: payload.data
        });
    }
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
            if (clientList.length > 0) {
                return clientList[0].focus();
            }
            return clients.openWindow('./');
        })
    );
});

// --- CONFIGURATION DU CACHE ---

// Nom du cache. Changer cette valeur invalidera le cache existant et en créera un nouveau.
const CACHE_NAME = 'warrior-tracker-v105';

// Liste des fichiers essentiels à mettre en cache pour que l'application fonctionne hors ligne.
const urlsToCache = [
  './',             // La racine de l'application (souvent index.html)
  './index.html',
  './style.css',
  './favicon.svg',
  './manifest.json', // Le manifeste de la PWA
  // Modules JS
  './src/app.js',
  './src/config/firebase.js',
  './src/core/badges.js',
  './src/core/habits.js',
  './src/core/ranks.js',
  './src/core/scores.js',
  './src/pages/groups.js',
  './src/pages/motivation.js',
  './src/pages/profile.js',
  './src/pages/stats.js',
  './src/pages/today.js',
  './src/services/notifications.js',
  './src/services/state.js',
  './src/services/storage.js',
  './src/ui/calendar.js',
  './src/ui/charts.js',
  './src/ui/confetti.js',
  './src/ui/modals.js',
  './src/ui/sounds.js',
  './src/ui/theme.js',
  './src/ui/toast.js',
  './src/ui/tutorial.js',
  './src/ui/export.js',
  './src/ui/heatmap.js',
  './src/ui/celebration.js',
  './src/ui/chat.js',
  './src/ui/leaderboard.js',
  './src/ui/challenges.js',
  './src/ui/auto-messages.js',
  './src/ui/rewards.js',
  './src/ui/levelup.js',
  './src/ui/streak-display.js',
  './src/ui/analytics.js',
  './src/ui/install.js',
  './src/ui/share.js',
  './src/ui/qrcode.js',
  './src/core/xp.js',
  './src/services/i18n.js',
  './src/services/pseudo-validator.js',
  './src/utils/lazy.js',
  './src/ui/tactical-ux.css',
  './apple-shortcut.html',
  './offline.html',
  './cgu.html',
  './privacy.html',
  // Firebase SDK
  'https://www.gstatic.com/firebasejs/9.17.1/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/9.17.1/firebase-auth-compat.js',
  'https://www.gstatic.com/firebasejs/9.17.1/firebase-firestore-compat.js',
  'https://www.gstatic.com/firebasejs/9.17.1/firebase-messaging-compat.js'
];


// --- ÉVÉNEMENTS DU SERVICE WORKER ---

/**
 * Événement 'install' : se déclenche lorsque le service worker est installé.
 * C'est le moment idéal pour mettre en cache les ressources statiques de l'application.
 */
self.addEventListener('install', event => {
  self.skipWaiting(); // Force activation immédiate
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Fichiers mis en cache lors de l\'installation');
        return cache.addAll(urlsToCache);
      })
  );
});

/**
 * Événement 'fetch' : se déclenche pour chaque requête réseau (ex: chargement d'une page, d'une image, d'un script).
 * Ici, on implémente une stratégie "Cache First" (cache d\'abord).
 */
self.addEventListener('fetch', event => {
  const url = event.request.url;
  
  // Skip caching for Firebase APIs (Firestore, Auth, etc.)
  if (url.includes('firestore.googleapis.com') || 
      url.includes('identitytoolkit.googleapis.com') ||
      url.includes('securetoken.googleapis.com') ||
      url.includes('firebase.googleapis.com') ||
      url.includes('fcm.googleapis.com') ||
      url.includes('fcmregistrations.googleapis.com')) {
    // Let Firebase requests go through directly
    return;
  }
  
  event.respondWith(
    fetch(event.request).then(response => {
      // Network OK → update cache + return
      if (response && response.status === 200) {
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
      }
      return response;
    }).catch(() => {
      // Offline → fallback to cache
      return caches.match(event.request).then(cached => {
        if (cached) return cached;
        if (event.request.mode === 'navigate') {
          return caches.match('./offline.html');
        }
        return new Response('', { status: 503, statusText: 'Service Unavailable' });
        });
      })
  );
});

/**
 * Événement 'activate' : se déclenche lorsque le service worker est activé.
 * C'est le bon moment pour nettoyer les anciens caches qui ne sont plus utilisés.
 */
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.filter(cacheName => cacheName !== CACHE_NAME)
          .map(cacheName => caches.delete(cacheName))
      );
    }).then(() => self.clients.claim()) // Prend le contrôle immédiatement
  );
});