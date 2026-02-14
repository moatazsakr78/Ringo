// Custom Service Worker Extensions
// This file is merged with the generated service worker by next-pwa

// ============================================
// Offline Navigation Handler
// يعترض طلبات التصفح ويخدمها من الـ cache عند فشل الشبكة
// ============================================
self.addEventListener('fetch', (event) => {
  // فقط للـ navigation requests (فتح صفحة في المتصفح)
  if (event.request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          // حاول من الـ network أولاً مع timeout قصير (3 ثواني)
          const networkResponse = await Promise.race([
            fetch(event.request),
            new Promise((_, reject) =>
              setTimeout(() => reject(new Error('timeout')), 3000)
            )
          ]);

          // تخزين صفحة POS في الـ cache عند نجاح الـ fetch
          const url = new URL(event.request.url);
          if (networkResponse.ok && url.pathname === '/pos') {
            const cache = await caches.open('critical-pages-cache');
            cache.put(event.request, networkResponse.clone());
            console.log('Service Worker: Cached POS page');
          }

          return networkResponse;
        } catch (error) {
          console.log('Service Worker: Network failed, trying cache for:', event.request.url);

          const url = new URL(event.request.url);

          // للصفحات الحرجة (POS)، جرب الـ critical-pages-cache أولاً
          if (url.pathname === '/pos') {
            const criticalCache = await caches.open('critical-pages-cache');
            const criticalResponse = await criticalCache.match(event.request);
            if (criticalResponse) {
              console.log('Service Worker: Serving POS from critical cache');
              return criticalResponse;
            }
            // جرب بدون query string
            const criticalClean = await criticalCache.match('/pos');
            if (criticalClean) {
              console.log('Service Worker: Serving POS from critical cache (clean URL)');
              return criticalClean;
            }
          }

          // جرب الـ cache العام
          const cachedResponse = await caches.match(event.request);
          if (cachedResponse) {
            console.log('Service Worker: Serving from cache:', event.request.url);
            return cachedResponse;
          }

          // جرب الـ cache بدون query string
          const cleanUrl = url.origin + url.pathname;
          const cachedClean = await caches.match(cleanUrl);
          if (cachedClean) {
            console.log('Service Worker: Serving from cache (clean URL):', cleanUrl);
            return cachedClean;
          }

          // جرب أي صفحة مشابهة في الـ cache
          const allCaches = await caches.keys();
          for (const cacheName of allCaches) {
            const cache = await caches.open(cacheName);
            const keys = await cache.keys();
            for (const key of keys) {
              if (key.url.includes(url.pathname)) {
                console.log('Service Worker: Found similar cached URL:', key.url);
                return cache.match(key);
              }
            }
          }

          // Fallback للـ offline page
          console.log('Service Worker: No cache found, showing offline page');
          const offlinePage = await caches.match('/offline.html');
          if (offlinePage) return offlinePage;

          // آخر حل - رسالة بسيطة
          return new Response(`
            <!DOCTYPE html>
            <html dir="rtl" lang="ar">
            <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>غير متصل بالإنترنت</title>
              <style>
                body {
                  font-family: 'Cairo', sans-serif;
                  background: #1F2937;
                  color: white;
                  display: flex;
                  justify-content: center;
                  align-items: center;
                  height: 100vh;
                  margin: 0;
                  text-align: center;
                }
                .container { padding: 20px; }
                h1 { color: #3B82F6; }
                button {
                  background: #3B82F6;
                  color: white;
                  border: none;
                  padding: 12px 24px;
                  border-radius: 8px;
                  cursor: pointer;
                  font-size: 16px;
                  margin-top: 20px;
                }
                button:hover { background: #2563EB; }
              </style>
            </head>
            <body>
              <div class="container">
                <h1>📡 أنت غير متصل بالإنترنت</h1>
                <p>يرجى التحقق من اتصالك بالإنترنت والمحاولة مرة أخرى</p>
                <button onclick="location.reload()">إعادة المحاولة</button>
              </div>
            </body>
            </html>
          `, {
            status: 503,
            headers: { 'Content-Type': 'text/html; charset=utf-8' }
          });
        }
      })()
    );
  }
});

// Background sync for offline sales
self.addEventListener('sync', (event) => {
  console.log('Service Worker: Background sync', event.tag);

  if (event.tag === 'sync-offline-sales') {
    event.waitUntil(syncOfflineSales());
  }
});

async function syncOfflineSales() {
  try {
    // Notify all clients to perform sync
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
      client.postMessage({
        type: 'SYNC_OFFLINE_SALES',
        timestamp: Date.now()
      });
    });
    console.log('Service Worker: Notified clients to sync');
  } catch (error) {
    console.error('Service Worker: Background sync failed', error);
  }
}

// Listen for messages from clients
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data && event.data.type === 'CLEAR_CACHE') {
    caches.keys().then(cacheNames => {
      cacheNames.forEach(cacheName => {
        caches.delete(cacheName);
      });
    });
  }

  if (event.data && event.data.type === 'CACHE_URLS') {
    // Allow caching specific URLs on demand
    const urls = event.data.urls;
    if (urls && urls.length > 0) {
      caches.open('runtime-cache').then(cache => {
        cache.addAll(urls).catch(err => {
          console.warn('Failed to cache URLs:', err);
        });
      });
    }
  }

  // تخزين الصفحات الحرجة (مثل POS) عند الطلب
  if (event.data && event.data.type === 'CACHE_CRITICAL_PAGES') {
    const pages = event.data.pages || [];
    console.log('Service Worker: Caching critical pages:', pages);

    caches.open('critical-pages-cache').then(async (cache) => {
      for (const page of pages) {
        try {
          const response = await fetch(page, { credentials: 'include' });
          if (response.ok) {
            await cache.put(page, response);
            console.log('Service Worker: Cached critical page:', page);
          }
        } catch (err) {
          console.warn('Service Worker: Failed to cache critical page:', page, err);
        }
      }
    });
  }
});

// Push notification handling
self.addEventListener('push', (event) => {
  console.log('Service Worker: Push received');

  let data = { title: 'نظام نقاط البيع', body: 'إشعار جديد' };

  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: '/assets/logo/Ringo2.png',
    badge: '/assets/logo/Ringo2.png',
    dir: 'rtl',
    lang: 'ar',
    vibrate: [100, 50, 100],
    data: data.data || {}
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Notification click handling
self.addEventListener('notificationclick', (event) => {
  console.log('Service Worker: Notification clicked');

  event.notification.close();

  event.waitUntil(
    clients.matchAll({ type: 'window' }).then(clientList => {
      // Focus existing window or open new one
      for (const client of clientList) {
        if (client.url.includes('/pos') && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow('/pos');
      }
    })
  );
});

console.log('Custom Service Worker Extensions loaded');
