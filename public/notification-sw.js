self.addEventListener('push', (event) => {
  const payload = (() => {
    try {
      return event.data ? event.data.json() : {};
    } catch {
      return {};
    }
  })();

  const title = payload.title || 'AcestarAI reminder';
  const options = {
    body: payload.body || 'A scheduled meeting needs your follow-up in AcestarAI.',
    icon: '/assets/acestar-logo',
    badge: '/assets/acestar-logo',
    tag: payload.tag || 'acestar-reminder',
    data: {
      url: payload.url || '/?tab=meetings'
    }
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetUrl = event.notification?.data?.url || '/?tab=meetings';

  event.waitUntil((async () => {
    const clientList = await clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    });

    for (const client of clientList) {
      const currentUrl = new URL(client.url);
      if (currentUrl.origin === self.location.origin) {
        if ('focus' in client) {
          await client.focus();
        }
        if ('navigate' in client) {
          await client.navigate(targetUrl);
        }
        return;
      }
    }

    if (clients.openWindow) {
      await clients.openWindow(targetUrl);
    }
  })());
});
