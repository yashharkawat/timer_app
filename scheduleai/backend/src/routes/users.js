import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// GET /api/users/me
router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const user = await req.prisma.user.findUnique({
      where: { id: req.user.id },
      include: { settings: true },
    });
    res.json(user);
  } catch (err) {
    next(err);
  }
});

export default router;
