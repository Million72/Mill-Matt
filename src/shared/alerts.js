// Pure alert-message building. Not currently called anywhere — notification
// sending was removed from hooks/useAlerts.js by request (it crashed on
// Android Chrome, which doesn't support the raw Notification constructor;
// see that file's history). Kept here, matching the required project
// structure, as a ready-to-use message formatter if notifications are
// re-enabled later via a proper ServiceWorkerRegistration.showNotification()
// path instead of the constructor that crashed.
export function buildAlertMessage(signal) {
  const title = `${signal.signal} · ${signal.name}`;
  const price = signal.price >= 1000 ? signal.price.toFixed(2) : signal.price.toFixed(4);
  const body = `${price} · confidence ${signal.confidence}% · ${signal.tier}`;
  const key = `${signal.symbol}_${signal.signal}_${signal.time}`;
  return { title, body, key };
}
