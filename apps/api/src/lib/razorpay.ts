import { createHmac, timingSafeEqual } from 'node:crypto';
import { z } from 'zod';
import { AppError } from './errors.js';
import { logger } from './logger.js';

/**
 * The payment provider as the rest of the app sees it. Production uses Razorpay; tests
 * pass a fake with the same signature rules, so no network calls happen in tests.
 */
export interface PaymentGateway {
  readonly keyId: string;
  createOrder(input: { amount: number; receipt: string }): Promise<{ id: string; amount: number }>;
  fetchPayment(paymentId: string): Promise<{ id: string; orderId: string; amount: number; status: string }>;
  isValidPaymentSignature(input: { orderId: string; paymentId: string; signature: string }): boolean;
  isValidWebhookSignature(rawBody: Buffer, signature: string): boolean;
}

export function hmacSha256Hex(secret: string, data: string | Buffer): string {
  return createHmac('sha256', secret).update(data).digest('hex');
}

/** Constant-time comparison, so response timing can't reveal how much of a signature matched. */
export function safeEqualHex(expected: string, received: string): boolean {
  const a = Buffer.from(expected, 'utf8');
  const b = Buffer.from(received, 'utf8');
  return a.length === b.length && timingSafeEqual(a, b);
}

const RAZORPAY_API = 'https://api.razorpay.com/v1';
const REQUEST_TIMEOUT_MS = 10_000;

const orderResponse = z.object({ id: z.string(), amount: z.number().int() });
const paymentResponse = z.object({
  id: z.string(),
  order_id: z.string(),
  amount: z.number().int(),
  status: z.string(),
});

export function createRazorpayGateway(options: {
  keyId: string;
  keySecret: string;
  webhookSecret: string;
}): PaymentGateway {
  const authHeader = `Basic ${Buffer.from(`${options.keyId}:${options.keySecret}`).toString('base64')}`;

  async function call<T>(path: string, schema: z.ZodType<T>, init?: RequestInit): Promise<T> {
    let response: Response;
    try {
      response = await fetch(`${RAZORPAY_API}${path}`, {
        ...init,
        headers: { Authorization: authHeader, 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
    } catch (error) {
      logger.error({ err: error, path }, 'Razorpay request failed');
      throw new AppError(502, 'PAYMENT_PROVIDER_ERROR', 'Payment service is unavailable. Please try again.');
    }
    const body: unknown = await response.json().catch(() => null);
    const parsed = schema.safeParse(body);
    if (!response.ok || !parsed.success) {
      // Razorpay error bodies contain no secrets; log them for diagnosis.
      logger.error({ path, status: response.status, body }, 'Razorpay returned an error');
      throw new AppError(502, 'PAYMENT_PROVIDER_ERROR', 'Payment service is unavailable. Please try again.');
    }
    return parsed.data;
  }

  return {
    keyId: options.keyId,

    async createOrder({ amount, receipt }) {
      return call('/orders', orderResponse, {
        method: 'POST',
        body: JSON.stringify({ amount, currency: 'INR', receipt }),
      });
    },

    async fetchPayment(paymentId) {
      const payment = await call(`/payments/${encodeURIComponent(paymentId)}`, paymentResponse);
      return { id: payment.id, orderId: payment.order_id, amount: payment.amount, status: payment.status };
    },

    // https://razorpay.com/docs/payments/server-integration/nodejs/integration-steps/#verify-payment-signature
    isValidPaymentSignature({ orderId, paymentId, signature }) {
      return safeEqualHex(hmacSha256Hex(options.keySecret, `${orderId}|${paymentId}`), signature);
    },

    // Must be computed over the raw request body, byte for byte.
    isValidWebhookSignature(rawBody, signature) {
      return safeEqualHex(hmacSha256Hex(options.webhookSecret, rawBody), signature);
    },
  };
}
