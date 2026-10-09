import type { OrderDetail, VerifyPaymentInput } from '@roopaank/shared';
import { z } from 'zod';
import { badRequest, conflict, notFound } from '../../lib/errors.js';
import { logger } from '../../lib/logger.js';
import { type Db, isUniqueViolation, prisma } from '../../lib/prisma.js';
import type { PaymentGateway } from '../../lib/razorpay.js';
import { getOrderForUser } from '../orders/orders.service.js';

/**
 * Razorpay payment states that mean the money is ours. "authorized" payments are
 * captured automatically when auto-capture is enabled in the Razorpay dashboard (required).
 */
const COMPLETED_PAYMENT_STATES = new Set(['captured', 'authorized']);

/**
 * Marks a payment PAID, takes the stock and confirms the order — exactly once.
 * Called from both the browser verify call and the webhook, whichever arrives first;
 * the conditional update makes the second caller a no-op.
 */
export async function confirmPayment(tx: Db, paymentId: string, providerPaymentId: string): Promise<void> {
  const { count } = await tx.payment.updateMany({
    where: { id: paymentId, status: { not: 'PAID' } },
    data: { status: 'PAID', providerPaymentId },
  });
  if (count === 0) return; // already confirmed

  const order = await tx.order.findFirstOrThrow({
    where: { payments: { some: { id: paymentId } } },
    include: { items: true },
  });

  // Stock is decremented only now (D8). A conditional update can never take stock below
  // zero; if it is short (rare race), the order is still confirmed but flagged for the admin.
  let stockShort = false;
  for (const item of order.items) {
    const updated = await tx.product.updateMany({
      where: { id: item.productId, stockQuantity: { gte: item.quantity } },
      data: { stockQuantity: { decrement: item.quantity } },
    });
    if (updated.count === 0) stockShort = true;
  }

  const confirmable = order.status === 'PENDING' || order.status === 'PAYMENT_FAILED';
  if (!confirmable) logger.error({ orderId: order.id, status: order.status }, 'Payment received for an order in an unexpected status');

  await tx.order.update({
    where: { id: order.id },
    data: {
      paymentStatus: 'PAID',
      needsAttention: order.needsAttention || stockShort || !confirmable,
      ...(confirmable && { status: 'CONFIRMED', statusHistory: { create: { status: 'CONFIRMED' } } }),
    },
  });

  await tx.cartItem.deleteMany({
    where: { cart: { userId: order.userId }, productId: { in: order.items.map((item) => item.productId) } },
  });

  if (stockShort) logger.warn({ orderId: order.id }, 'Paid order is short of stock; flagged needsAttention');
}

async function markPaymentFailed(tx: Db, providerOrderId: string): Promise<void> {
  const payment = await tx.payment.findUnique({ where: { providerOrderId } });
  if (!payment) return;
  const { count } = await tx.payment.updateMany({ where: { id: payment.id, status: 'CREATED' }, data: { status: 'FAILED' } });
  if (count === 0) return;
  const updated = await tx.order.updateMany({
    where: { id: payment.orderId, status: 'PENDING' },
    data: { status: 'PAYMENT_FAILED', paymentStatus: 'FAILED' },
  });
  if (updated.count > 0) {
    await tx.orderStatusHistory.create({ data: { orderId: payment.orderId, status: 'PAYMENT_FAILED' } });
  }
}

/** Called by the web app after Razorpay Checkout succeeds (SPEC §7.6). Idempotent. */
export async function verifyPayment(
  userId: string,
  input: VerifyPaymentInput,
  gateway: PaymentGateway,
): Promise<OrderDetail> {
  const payment = await prisma.payment.findUnique({
    where: { providerOrderId: input.razorpayOrderId },
    include: { order: { select: { userId: true } } },
  });
  if (!payment || payment.order.userId !== userId) throw notFound('PAYMENT_NOT_FOUND', 'Payment not found');

  const signatureOk = gateway.isValidPaymentSignature({
    orderId: input.razorpayOrderId,
    paymentId: input.razorpayPaymentId,
    signature: input.signature,
  });
  if (!signatureOk) {
    logger.warn({ paymentId: payment.id }, 'Rejected payment with an invalid signature');
    throw badRequest('INVALID_PAYMENT_SIGNATURE', 'Payment could not be verified');
  }

  if (payment.status !== 'PAID') {
    // The signature proves the ids belong together; this confirms the amount and state with Razorpay.
    const remote = await gateway.fetchPayment(input.razorpayPaymentId);
    if (remote.orderId !== payment.providerOrderId || remote.amount !== payment.amount) {
      logger.error(
        { paymentId: payment.id, expectedAmount: payment.amount, remoteAmount: remote.amount },
        'Payment does not match its order',
      );
      throw conflict('PAYMENT_MISMATCH', 'Payment details do not match this order');
    }
    if (!COMPLETED_PAYMENT_STATES.has(remote.status)) {
      throw conflict('PAYMENT_NOT_COMPLETED', 'Payment has not been completed');
    }
    await prisma.$transaction((tx) => confirmPayment(tx, payment.id, input.razorpayPaymentId));
  }

  return getOrderForUser(userId, payment.orderId);
}

const webhookSchema = z.object({
  event: z.string(),
  payload: z.object({
    payment: z
      .object({
        entity: z.object({
          id: z.string(),
          order_id: z.string().nullable(),
          amount: z.number().int(),
          status: z.string(),
        }),
      })
      .optional(),
  }),
});

export type WebhookResult = 'processed' | 'duplicate';

/**
 * Razorpay server-to-server notification. Gives the same outcome as verify when the
 * customer's browser never comes back (closed tab, network drop).
 */
export async function handleWebhook(
  rawBody: Buffer,
  signature: string | undefined,
  eventId: string | undefined,
  gateway: PaymentGateway,
): Promise<WebhookResult> {
  if (!signature || !gateway.isValidWebhookSignature(rawBody, signature)) {
    logger.warn('Rejected webhook with an invalid signature');
    throw badRequest('INVALID_WEBHOOK_SIGNATURE', 'Invalid webhook signature');
  }
  if (!eventId) throw badRequest('MISSING_EVENT_ID', 'Missing x-razorpay-event-id header');

  let json: unknown;
  try {
    json = JSON.parse(rawBody.toString('utf8'));
  } catch {
    throw badRequest('INVALID_JSON', 'Webhook body is not valid JSON');
  }
  const parsed = webhookSchema.safeParse(json);
  if (!parsed.success) throw badRequest('INVALID_WEBHOOK_PAYLOAD', 'Unexpected webhook payload');
  const { event, payload } = parsed.data;

  try {
    // Recording the event and acting on it commit together, so a crash can't mark an
    // event as handled without its effects (Razorpay would then retry it).
    await prisma.$transaction(async (tx) => {
      await tx.webhookEvent.create({ data: { provider: 'RAZORPAY', eventId, type: event } });
      const entity = payload.payment?.entity;
      if (!entity?.order_id) return;

      if (event === 'payment.captured' || event === 'order.paid') {
        const payment = await tx.payment.findUnique({ where: { providerOrderId: entity.order_id } });
        if (!payment) {
          logger.warn({ eventId, providerOrderId: entity.order_id }, 'Webhook for an unknown order');
          return;
        }
        if (entity.amount !== payment.amount) {
          logger.error({ eventId, paymentId: payment.id }, 'Webhook amount does not match the order');
          await tx.order.update({ where: { id: payment.orderId }, data: { needsAttention: true } });
          return;
        }
        await confirmPayment(tx, payment.id, entity.id);
      } else if (event === 'payment.failed') {
        await markPaymentFailed(tx, entity.order_id);
      }
    });
  } catch (error) {
    if (isUniqueViolation(error)) return 'duplicate'; // same event delivered again
    throw error;
  }
  return 'processed';
}
