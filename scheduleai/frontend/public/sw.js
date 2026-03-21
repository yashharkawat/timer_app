self.addEventListener('install', e => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));

self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      return clients.openWindow('/');
    })
  );
});

// Real Web Push — fired by the browser when backend sends a push
self.addEventListener('push', e => {
  let data = { title: 'ScheduleAI', body: 'Time for your session!' };
  try {
    if (e.data) data = { ...data, ...JSON.parse(e.data.text()) };
  } catch {}

  e.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/icon.svg',
      tag: 'daily-reminder',
      renotify: true,
      vibrate: [200, 100, 200],
    })
  );
});
