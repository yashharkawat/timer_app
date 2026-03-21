import { createClerkClient } from '@clerk/clerk-sdk-node';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const token = authHeader.slice(7);

    // Verify JWT with Clerk
    const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });
    let payload;
    try {
      payload = await clerk.verifyToken(token);
    } catch (e) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    const clerkId = payload.sub;

    // Get or create user in our DB
    let user = await prisma.user.findUnique({ where: { clerkId } });
    if (!user) {
      // First time — fetch user details from Clerk and create in DB
      const clerkUser = await clerk.users.getUser(clerkId);
      const email = clerkUser.emailAddresses[0]?.emailAddress || '';
      const name = [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(' ') || null;
      user = await prisma.user.create({
        data: {
          clerkId,
          email,
          name,
          settings: { create: {} }, // create default settings
        },
      });
    }

    req.user = user;
    req.prisma = prisma;
    next();
  } catch (err) {
    next(err);
  }
}
