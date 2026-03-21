export async function scheduleNotification(settings) {
  if (!('Notification' in window)) return { error: 'Not supported' };
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return { error: 'Permission denied' };
  const reg = await navigator.serviceWorker.ready;
  const [hours, mins] = settings.time.split(':').map(Number);
  const now = new Date();
  const next = new Date();
  next.setHours(hours, mins, 0, 0);
  if (next <= now) next.setDate(next.getDate() + 1);
  const delay = next.getTime() - now.getTime();
  reg.active.postMessage({
    type: 'SCHEDULE_NOTIFICATION',
    title: 'ScheduleAI',
    body: settings.message,
    delay,
  });
  return { success: true, nextAt: next };
}

export async function sendTestNotification() {
  if (!('Notification' in window)) return { error: 'Not supported' };
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return { error: 'Permission denied' };
  const reg = await navigator.serviceWorker.ready;
  reg.active.postMessage({
    type: 'SCHEDULE_NOTIFICATION',
    title: 'ScheduleAI',
    body: 'Test notification — your reminders are working!',
    delay: 0,
  });
  return { success: true };
}
