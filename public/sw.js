self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = {};
  }

  const title = data.title || 'לוזזזייי';
  const options = {
    body: data.body || '',
    icon: '/images/favicon-192.png',
    badge: '/images/favicon-32.png',
    dir: 'rtl',
    lang: 'he',
    data: { url: data.url || '/' },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Fires when the browser itself invalidates/rotates a subscription (Chrome/Android does
// this more than Safari) — without handling it, that device would silently stop getting
// pushes until it next opens the app and syncPushSubscriptionIfGranted() happens to notice.
self.addEventListener('pushsubscriptionchange', (event) => {
  const oldKey = event.oldSubscription?.options?.applicationServerKey;
  event.waitUntil(
    self.registration.pushManager
      .subscribe(oldKey ? { userVisibleOnly: true, applicationServerKey: oldKey } : { userVisibleOnly: true })
      .then((subscription) =>
        fetch('/api/push/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(subscription),
        })
      )
      .catch((err) => console.error('pushsubscriptionchange re-subscribe failed', err))
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow(url);
      return undefined;
    })
  );
});
