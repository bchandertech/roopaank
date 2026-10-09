import { Router } from 'express';
import { orderListQuerySchema } from '@roopaank/shared';
import { currentUser, requireUser } from '../../middleware/auth.js';
import type { PaymentGateway } from '../../lib/razorpay.js';
import { idParamSchema, parse } from '../../lib/validate.js';
import * as orders from './orders.service.js';

export function ordersRouter(gateway: PaymentGateway): Router {
  const router = Router();
  router.use(requireUser);

  router.get('/', async (req, res) => {
    res.json(await orders.listOrders(currentUser(req).id, parse(orderListQuerySchema, req.query)));
  });

  router.get('/:id', async (req, res) => {
    const { id } = parse(idParamSchema, req.params);
    res.json(await orders.getOrderForUser(currentUser(req).id, id));
  });

  router.post('/:id/pay', async (req, res) => {
    const { id } = parse(idParamSchema, req.params);
    res.json(await orders.retryPayment(currentUser(req).id, id, gateway));
  });

  return router;
}
