import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// POST /api/sessions
router.post('/', requireAuth, async (req, res, next) => {
  try {
    const { dayId, completedSteps, totalSteps, durationMinutes, notes } = req.body;
    const log = await req.prisma.sessionLog.create({
      data: {
        userId: req.user.id,
        dayId,
        completedSteps,
        totalSteps,
        durationMinutes,
        notes: notes || null,
      },
    });
    res.status(201).json(log);
  } catch (err) {
    next(err);
  }
});

// GET /api/sessions
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 30;
    const logs = await req.prisma.sessionLog.findMany({
      where: { userId: req.user.id },
      orderBy: { completedAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: { day: true },
    });
    res.json(logs);
  } catch (err) {
    next(err);
  }
});

// GET /api/sessions/streak
router.get('/streak', requireAuth, async (req, res, next) => {
  try {
    const logs = await req.prisma.sessionLog.findMany({
      where: { userId: req.user.id },
      orderBy: { completedAt: 'desc' },
      select: { completedAt: true },
    });

    if (!logs.length) return res.json({ streak: 0 });

    let streak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const dates = [...new Set(logs.map(l => {
      const d = new Date(l.completedAt);
      d.setHours(0, 0, 0, 0);
      return d.getTime();
    }))].sort((a, b) => b - a);

    for (let i = 0; i < dates.length; i++) {
      const expected = new Date(today);
      expected.setDate(today.getDate() - i);
      if (dates[i] === expected.getTime()) {
        streak++;
      } else {
        break;
      }
    }

    res.json({ streak });
  } catch (err) {
    next(err);
  }
});

export default router;
