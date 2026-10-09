import { config } from '../../src/config/env.js';
import { AppError } from '../../src/lib/errors.js';
import { createRazorpayGateway, hmacSha256Hex, type PaymentGateway } from '../../src/lib/razorpay.js';

/**
 * Stands in for Razorpay in tests. Order/payment lookups are in memory, but signature
 * checks use the real implementation with the test secrets, so they are tested for real.
 */
export class FakeGateway implements PaymentGateway {
  readonly keyId = config.RAZORPAY_KEY_ID;
  private readonly real = createRazorpayGateway({
    keyId: config.RAZORPAY_KEY_ID,
    keySecret: config.RAZORPAY_KEY_SECRET,
    webhookSecret: config.RAZORPAY_WEBHOOK_SECRET,
  });
  private seq = 0;
  private readonly orders = new Map<string, number>();
  private readonly payments = new Map<string, { orderId: string; amount: number; status: string }>();
  failNextCreateOrder = false;

  async createOrder({ amount }: { amount: number; receipt: string }) {
    if (this.failNextCreateOrder) {
      this.failNextCreateOrder = false;
      throw new AppError(502, 'PAYMENT_PROVIDER_ERROR', 'Payment service is unavailable. Please try again.');
    }
    const id = `order_test${++this.seq}`;
    this.orders.set(id, amount);
    return { id, amount };
  }

  async fetchPayment(paymentId: string) {
    const payment = this.payments.get(paymentId);
    if (!payment)
      throw new AppError(502, 'PAYMENT_PROVIDER_ERROR', 'Payment service is unavailable. Please try again.');
    return { id: paymentId, ...payment };
  }

  isValidPaymentSignature(input: { orderId: string; paymentId: string; signature: string }) {
    return this.real.isValidPaymentSignature(input);
  }

  isValidWebhookSignature(rawBody: Buffer, signature: string) {
    return this.real.isValidWebhookSignature(rawBody, signature);
  }

  /** Simulates paying in Razorpay Checkout; returns the body the browser sends to /payments/verify. */
  pay(razorpayOrderId: string, options: { amount?: number; status?: string } = {}) {
    const razorpayPaymentId = `pay_test${++this.seq}`;
    this.payments.set(razorpayPaymentId, {
      orderId: razorpayOrderId,
      amount: options.amount ?? this.orders.get(razorpayOrderId) ?? 0,
      status: options.status ?? 'captured',
    });
    const signature = hmacSha256Hex(config.RAZORPAY_KEY_SECRET, `${razorpayOrderId}|${razorpayPaymentId}`);
    return { razorpayOrderId, razorpayPaymentId, signature };
  }

  /** Builds a signed webhook delivery the way Razorpay would send it. */
  webhook(event: string, entity: { id: string; order_id: string; amount: number; status: string }) {
    const body = JSON.stringify({ event, payload: { payment: { entity } } });
    return { body, signature: hmacSha256Hex(config.RAZORPAY_WEBHOOK_SECRET, body) };
  }
}
