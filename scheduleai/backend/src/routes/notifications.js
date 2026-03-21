import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { sendPush } from '../lib/push.js';

const router = Router();

// POST /api/notifications/subscribe
router.post('/subscribe', requireAuth, async (req, res, next) => {
  try {
    const { endpoint, keys } = req.body;
    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return res.status(400).json({ error: 'Invalid subscription' });
    }

    await req.prisma.pushSubscription.upsert({
      where: { endpoint },
      update: { p256dh: keys.p256dh, auth: keys.auth, userId: req.user.id },
      create: {
        userId: req.user.id,
        endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
      },
    });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/notifications/subscribe
router.delete('/subscribe', requireAuth, async (req, res, next) => {
  try {
    const { endpoint } = req.body;
    if (endpoint) {
      await req.prisma.pushSubscription.deleteMany({
        where: { endpoint, userId: req.user.id },
      });
    } else {
      await req.prisma.pushSubscription.deleteMany({
        where: { userId: req.user.id },
      });
    }
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// POST /api/notifications/test
router.post('/test', requireAuth, async (req, res, next) => {
  try {
    const subs = await req.prisma.pushSubscription.findMany({
      where: { userId: req.user.id },
    });
    if (!subs.length) return res.status(400).json({ error: 'No push subscription found. Enable notifications first.' });

    await Promise.all(
      subs.map(sub => sendPush(sub, {
        title: 'ScheduleAI',
        body: 'Test notification — your reminders are working!',
      }))
    );
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

export default router;
