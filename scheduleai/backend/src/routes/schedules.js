import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { parseScheduleFromText, getProvider } from '../lib/ai/index.js';

const router = Router();

// GET /api/schedules
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const schedules = await req.prisma.schedule.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
    });
    res.json(schedules);
  } catch (err) {
    next(err);
  }
});

// POST /api/schedules
router.post('/', requireAuth, async (req, res, next) => {
  try {
    const { title, description } = req.body;
    if (!title) return res.status(400).json({ error: 'Title required' });

    // If this is the first schedule, make it active
    const count = await req.prisma.schedule.count({ where: { userId: req.user.id } });

    const schedule = await req.prisma.schedule.create({
      data: {
        userId: req.user.id,
        title,
        description: description || null,
        isActive: count === 0,
      },
    });
    res.status(201).json(schedule);
  } catch (err) {
    next(err);
  }
});

// GET /api/schedules/active
router.get('/active', requireAuth, async (req, res, next) => {
  try {
    const schedule = await req.prisma.schedule.findFirst({
      where: { userId: req.user.id, isActive: true },
      include: {
        days: {
          orderBy: { sortOrder: 'asc' },
          include: {
            steps: { orderBy: { sortOrder: 'asc' } },
          },
        },
      },
    });
    res.json(schedule || null);
  } catch (err) {
    next(err);
  }
});

// GET /api/schedules/:id
router.get('/:id', requireAuth, async (req, res, next) => {
  try {
    const schedule = await req.prisma.schedule.findFirst({
      where: { id: req.params.id, userId: req.user.id },
      include: {
        days: {
          orderBy: { sortOrder: 'asc' },
          include: {
            steps: { orderBy: { sortOrder: 'asc' } },
          },
        },
      },
    });
    if (!schedule) return res.status(404).json({ error: 'Not found' });
    res.json(schedule);
  } catch (err) {
    next(err);
  }
});

// PUT /api/schedules/:id
router.put('/:id', requireAuth, async (req, res, next) => {
  try {
    const { title, description } = req.body;
    const schedule = await req.prisma.schedule.updateMany({
      where: { id: req.params.id, userId: req.user.id },
      data: { title, description },
    });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/schedules/:id
router.delete('/:id', requireAuth, async (req, res, next) => {
  try {
    await req.prisma.schedule.deleteMany({
      where: { id: req.params.id, userId: req.user.id },
    });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// POST /api/schedules/:id/activate
router.post('/:id/activate', requireAuth, async (req, res, next) => {
  try {
    // Deactivate all
    await req.prisma.schedule.updateMany({
      where: { userId: req.user.id },
      data: { isActive: false },
    });
    // Activate this one
    await req.prisma.schedule.updateMany({
      where: { id: req.params.id, userId: req.user.id },
      data: { isActive: true },
    });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// POST /api/schedules/import
// Import a full schedule JSON
router.post('/import', requireAuth, async (req, res, next) => {
  try {
    const { title, description, restSeconds, days } = req.body;
    if (!title || !days) return res.status(400).json({ error: 'title and days required' });

    // Deactivate existing
    await req.prisma.schedule.updateMany({
      where: { userId: req.user.id },
      data: { isActive: false },
    });

    const schedule = await req.prisma.schedule.create({
      data: {
        userId: req.user.id,
        title,
        description: description || null,
        restSeconds: Number(restSeconds) || 30,
        isActive: true,
        days: {
          create: days.map((day, di) => ({
            name: day.name,
            sortOrder: di,
            steps: {
              create: (day.steps || []).map((step, si) => ({
                title: step.title,
                durationMinutes: step.durationMinutes,
                instructions: step.instructions || null,
                sortOrder: si,
              })),
            },
          })),
        },
      },
      include: {
        days: {
          orderBy: { sortOrder: 'asc' },
          include: { steps: { orderBy: { sortOrder: 'asc' } } },
        },
      },
    });

    res.status(201).json(schedule);
  } catch (err) {
    next(err);
  }
});

// GET /api/schedules/ai-provider — tells frontend which provider is active
router.get('/ai-provider', requireAuth, (req, res) => {
  const provider = getProvider();
  res.json({ provider: provider || null });
});

// POST /api/schedules/import-ai
// Body: { text: "raw document text" }
router.post('/import-ai', requireAuth, async (req, res, next) => {
  try {
    const { text } = req.body;
    if (!text || text.trim().length < 20) {
      return res.status(400).json({ error: 'Document text too short or missing' });
    }

    const parsed = await parseScheduleFromText(text);
    const { title, description, restSeconds, days } = parsed;

    if (!title || !Array.isArray(days) || days.length === 0) {
      return res.status(422).json({ error: 'AI could not extract a valid schedule from this document' });
    }

    // Deactivate existing schedules
    await req.prisma.schedule.updateMany({
      where: { userId: req.user.id },
      data: { isActive: false },
    });

    const schedule = await req.prisma.schedule.create({
      data: {
        userId: req.user.id,
        title,
        description: description || null,
        restSeconds: Number(restSeconds) || 30,
        isActive: true,
        days: {
          create: days.map((day, di) => ({
            name: day.name,
            sortOrder: di,
            steps: {
              create: (day.steps || []).map((step, si) => ({
                title: step.title,
                durationMinutes: Number(step.durationMinutes) || 1,
                instructions: step.instructions || null,
                sortOrder: si,
              })),
            },
          })),
        },
      },
      include: {
        days: {
          orderBy: { sortOrder: 'asc' },
          include: { steps: { orderBy: { sortOrder: 'asc' } } },
        },
      },
    });

    res.status(201).json(schedule);
  } catch (err) {
    next(err);
  }
});

export default router;
