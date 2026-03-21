import webpush from 'web-push';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

let vapidConfigured = false;

function ensureVapid() {
  if (vapidConfigured) return;
  if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
    console.warn('VAPID keys not configured — push notifications disabled');
    return;
  }
  webpush.setVapidDetails(
    process.env.VAPID_EMAIL || 'mailto:admin@scheduleai.app',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
  vapidConfigured = true;
}

export async function sendPush(subscription, payload) {
  ensureVapid();
  if (!vapidConfigured) return;

  const pushSub = {
    endpoint: subscription.endpoint,
    keys: {
      p256dh: subscription.p256dh,
      auth: subscription.auth,
    },
  };

  try {
    await webpush.sendNotification(pushSub, JSON.stringify(payload));
  } catch (err) {
    if (err.statusCode === 410) {
      // Subscription expired — remove it
      await prisma.pushSubscription.deleteMany({
        where: { endpoint: subscription.endpoint },
      });
    } else {
      console.error('Push error:', err.message);
    }
  }
}

export async function sendScheduledNotifications() {
  ensureVapid();
  if (!vapidConfigured) return;

  const now = new Date();
  const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const dayNames = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  const currentDay = dayNames[now.getDay()];

  // Find all users with notifications enabled at this time on this day
  const settings = await prisma.userSettings.findMany({
    where: {
      notifEnabled: true,
      notifTime: currentTime,
    },
    include: {
      user: {
        include: { pushSubs: true },
      },
    },
  });

  for (const s of settings) {
    const notifDays = Array.isArray(s.notifDays) ? s.notifDays : JSON.parse(s.notifDays || '[]');
    if (!notifDays.includes(currentDay)) continue;
    if (!s.user.pushSubs.length) continue;

    await Promise.all(
      s.user.pushSubs.map(sub => sendPush(sub, {
        title: 'ScheduleAI',
        body: s.notifMessage || 'Time for your session!',
        url: '/',
      }))
    );
  }
}

export function getVapidPublicKey() {
  return process.env.VAPID_PUBLIC_KEY || '';
}
