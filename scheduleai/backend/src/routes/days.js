import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// POST /api/schedules/:scheduleId/days
router.post('/schedules/:scheduleId/days', requireAuth, async (req, res, next) => {
  try {
    const { name, subtitle, theme, sortOrder } = req.body;
    // Verify ownership
    const schedule = await req.prisma.schedule.findFirst({
      where: { id: req.params.scheduleId, userId: req.user.id },
    });
    if (!schedule) return res.status(404).json({ error: 'Schedule not found' });

    const day = await req.prisma.day.create({
      data: {
        scheduleId: req.params.scheduleId,
        name: name || 'New Day',
        subtitle: subtitle || null,
        theme: theme || null,
        sortOrder: sortOrder ?? 0,
      },
      include: { steps: true },
    });
    res.status(201).json(day);
  } catch (err) {
    next(err);
  }
});

// PUT /api/days/:id
router.put('/:id', requireAuth, async (req, res, next) => {
  try {
    const { name, subtitle, theme, sortOrder } = req.body;
    // Verify ownership via schedule
    const day = await req.prisma.day.findFirst({
      where: { id: req.params.id },
      include: { schedule: true },
    });
    if (!day || day.schedule.userId !== req.user.id) return res.status(404).json({ error: 'Not found' });

    const updated = await req.prisma.day.update({
      where: { id: req.params.id },
      data: { name, subtitle, theme, sortOrder },
      include: { steps: { orderBy: { sortOrder: 'asc' } } },
    });
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/days/:id
router.delete('/:id', requireAuth, async (req, res, next) => {
  try {
    const day = await req.prisma.day.findFirst({
      where: { id: req.params.id },
      include: { schedule: true },
    });
    if (!day || day.schedule.userId !== req.user.id) return res.status(404).json({ error: 'Not found' });

    await req.prisma.day.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// POST /api/days/:id/reorder — reorder steps in a day
router.post('/:id/reorder', requireAuth, async (req, res, next) => {
  try {
    const { stepIds } = req.body; // array of step ids in new order
    const day = await req.prisma.day.findFirst({
      where: { id: req.params.id },
      include: { schedule: true },
    });
    if (!day || day.schedule.userId !== req.user.id) return res.status(404).json({ error: 'Not found' });

    await Promise.all(
      stepIds.map((id, index) =>
        req.prisma.step.update({ where: { id }, data: { sortOrder: index } })
      )
    );
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

export default router;
