self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  let data = { title: 'Kograph Market', body: 'Ada notifikasi baru.' };
  try { data = event.data.json(); } catch {}
  event.waitUntil(
    self.registration.showNotification(data.title || 'Kograph Market', {
      body: data.body || 'Ada notifikasi baru.',
      icon: '/assets/kograph-logo.png',
      badge: '/assets/kograph-logo.png'
    })
  );
});
