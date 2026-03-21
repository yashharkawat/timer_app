import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// GET /api/settings
router.get('/', requireAuth, async (req, res, next) => {
  try {
    let settings = await req.prisma.userSettings.findUnique({
      where: { userId: req.user.id },
    });
    if (!settings) {
      settings = await req.prisma.userSettings.create({
        data: { userId: req.user.id },
      });
    }
    res.json(settings);
  } catch (err) {
    next(err);
  }
});

// PUT /api/settings
router.put('/', requireAuth, async (req, res, next) => {
  try {
    const {
      notifEnabled, notifTime, notifDays, notifMessage,
      voiceEnabled, voiceName, voiceRate, voicePitch, voiceAutoRead,
      soundsEnabled, soundVolume, theme, keepScreenOn,
    } = req.body;

    const settings = await req.prisma.userSettings.upsert({
      where: { userId: req.user.id },
      update: {
        notifEnabled, notifTime, notifDays, notifMessage,
        voiceEnabled, voiceName, voiceRate, voicePitch, voiceAutoRead,
        soundsEnabled, soundVolume, theme, keepScreenOn,
      },
      create: {
        userId: req.user.id,
        notifEnabled, notifTime, notifDays, notifMessage,
        voiceEnabled, voiceName, voiceRate, voicePitch, voiceAutoRead,
        soundsEnabled, soundVolume, theme, keepScreenOn,
      },
    });
    res.json(settings);
  } catch (err) {
    next(err);
  }
});

export default router;
