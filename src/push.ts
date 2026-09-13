const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined;

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function isPushSupported(): boolean {
  return 'serviceWorker' in navigator && 'PushManager' in window && !!VAPID_PUBLIC_KEY;
}

export function getNotificationPermission(): NotificationPermission | 'unsupported' {
  if (!('Notification' in window)) return 'unsupported';
  return Notification.permission;
}

async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) return null;
  try {
    return await navigator.serviceWorker.register('/sw.js');
  } catch (err) {
    console.error('Service worker registration failed', err);
    return null;
  }
}

/** Subscribes this device (if not already) and (re-)registers it with the server. */
async function subscribeAndRegister(registration: ServiceWorkerRegistration): Promise<boolean> {
  const existing = await registration.pushManager.getSubscription();
  const subscription = existing ?? await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY as string) as BufferSource,
  });

  const res = await fetch('/api/push/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(subscription),
  });
  return res.ok;
}

/** Requests notification permission and subscribes this device to push. Returns true on success. */
export async function enablePushNotifications(): Promise<boolean> {
  if (!isPushSupported()) return false;

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return false;

  const registration = await registerServiceWorker();
  if (!registration) return false;

  try {
    return await subscribeAndRegister(registration);
  } catch (err) {
    console.error('Push subscription failed', err);
    return false;
  }
}

/**
 * Re-registers this device's push subscription with the server if permission was already
 * granted in a past visit. Without this, a device that already granted permission never
 * calls the server again — so if the browser silently rotates or drops the subscription
 * (Chrome/Android does this more aggressively than Safari) or the server-side row is ever
 * lost, that device stops receiving reminders forever with no way to recover. Safe to call
 * on every app load: `getSubscription()` returns the existing one when nothing changed, and
 * the server upserts by endpoint, so this is a no-op in the common case.
 */
export async function syncPushSubscriptionIfGranted(): Promise<void> {
  if (!isPushSupported()) return;
  if (Notification.permission !== 'granted') return;

  const registration = await registerServiceWorker();
  if (!registration) return;

  try {
    await subscribeAndRegister(registration);
  } catch (err) {
    console.error('Push subscription resync failed', err);
  }
}
