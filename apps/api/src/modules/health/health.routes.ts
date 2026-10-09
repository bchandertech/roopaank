import { Router } from 'express';
import { config } from '../../config/env.js';
import { logger } from '../../lib/logger.js';
import { prisma } from '../../lib/prisma.js';

/** Used by uptime checks and load balancers: 200 only when the API can reach its database. */
export function healthRouter(): Router {
  const router = Router();

  router.get('/', async (_req, res) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      res.json({ status: 'ok', version: config.APP_VERSION });
    } catch (err) {
      logger.error({ err }, 'Health check: database unreachable');
      res.status(503).json({ status: 'unavailable', version: config.APP_VERSION });
    }
  });

  return router;
}
