import express, { type RequestHandler, Router } from 'express';
import { verifyPaymentSchema } from '@roopaank/shared';
import { currentUser, requireUser } from '../../middleware/auth.js';
import type { PaymentGateway } from '../../lib/razorpay.js';
import { parse } from '../../lib/validate.js';
import { handleWebhook, verifyPayment } from './payments.service.js';

export function paymentsRouter(gateway: PaymentGateway): Router {
  const router = Router();

  router.post('/verify', requireUser, async (req, res) => {
    res.json(await verifyPayment(currentUser(req).id, parse(verifyPaymentSchema, req.body), gateway));
  });

  return router;
}

/**
 * Mounted before the global JSON parser: the signature is an HMAC of the exact bytes
 * Razorpay sent, so the body must stay raw.
 */
export function paymentWebhookHandlers(gateway: PaymentGateway): RequestHandler[] {
  return [
    express.raw({ type: 'application/json', limit: '1mb' }),
    async (req, res) => {
      const rawBody = Buffer.isBuffer(req.body) ? req.body : Buffer.alloc(0);
      const result = await handleWebhook(
        rawBody,
        req.get('x-razorpay-signature'),
        req.get('x-razorpay-event-id'),
        gateway,
      );
      res.json({ received: true, result });
    },
  ];
}
