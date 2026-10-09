import { Router } from 'express';
import { checkoutSchema } from '@roopaank/shared';
import { currentUser, requireUser } from '../../middleware/auth.js';
import type { RateLimiters } from '../../middleware/rate-limit.js';
import type { PaymentGateway } from '../../lib/razorpay.js';
import { parse } from '../../lib/validate.js';
import { checkout } from './checkout.service.js';

export function checkoutRouter(gateway: PaymentGateway, limiters: RateLimiters): Router {
  const router = Router();

  router.post('/', requireUser, limiters.checkout, async (req, res) => {
    res.status(201).json(await checkout(currentUser(req).id, parse(checkoutSchema, req.body), gateway));
  });

  return router;
}
