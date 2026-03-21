import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// POST /api/days/:dayId/steps
router.post('/days/:dayId/steps', requireAuth, async (req, res, next) => {
  try {
    const { title, durationMinutes, type, instructions, source, sortOrder } = req.body;
    const day = await req.prisma.day.findFirst({
      where: { id: req.params.dayId },
      include: { schedule: true },
    });
    if (!day || day.schedule.userId !== req.user.id) return res.status(404).json({ error: 'Day not found' });

    const count = await req.prisma.step.count({ where: { dayId: req.params.dayId } });
    const step = await req.prisma.step.create({
      data: {
        dayId: req.params.dayId,
        title: title || 'New step',
        durationMinutes: durationMinutes || 5,
        type: type || 'active',
        instructions: instructions || null,
        source: source || null,
        sortOrder: sortOrder ?? count,
      },
    });
    res.status(201).json(step);
  } catch (err) {
    next(err);
  }
});

// PUT /api/steps/:id
router.put('/:id', requireAuth, async (req, res, next) => {
  try {
    const { title, durationMinutes, type, instructions, source, sortOrder } = req.body;
    const step = await req.prisma.step.findFirst({
      where: { id: req.params.id },
      include: { day: { include: { schedule: true } } },
    });
    if (!step || step.day.schedule.userId !== req.user.id) return res.status(404).json({ error: 'Not found' });

    const updated = await req.prisma.step.update({
      where: { id: req.params.id },
      data: { title, durationMinutes, type, instructions, source, sortOrder },
    });
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/steps/:id
router.delete('/:id', requireAuth, async (req, res, next) => {
  try {
    const step = await req.prisma.step.findFirst({
      where: { id: req.params.id },
      include: { day: { include: { schedule: true } } },
    });
    if (!step || step.day.schedule.userId !== req.user.id) return res.status(404).json({ error: 'Not found' });

    await req.prisma.step.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

export default router;
