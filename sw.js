
const CACHE = 'pwa-calc-v1';
const ASSETS = ['/', '/index.html', '/styles.css', '/app.js', '/manifest.json', '/icon-192.png', '/icon-512.png'];
self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.map(k => { if(k !== CACHE) return caches.delete(k); }))));
});
self.addEventListener('fetch', e => {
  if(e.request.url.includes('api.coingecko.com') || e.request.url.includes('exchangerate.host')){
    // network first for API calls, then cache fallback
    e.respondWith(fetch(e.request).then(res => { const c = res.clone(); caches.open(CACHE).then(cache => cache.put(e.request, c)); return res; }).catch(() => caches.match(e.request)));
    return;
  }
  e.respondWith(caches.match(e.request).then(r => r || fetch(e.request).then(res => { caches.open(CACHE).then(c => c.put(e.request, res.clone())); return res; })).catch(()=>caches.match('/')));
});
