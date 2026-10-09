// Checkout → payment verify → webhook: the money path (SPEC §7.6, ROO-65).
import request from 'supertest';
import { buildTestApp } from '../../../tests/helpers/app.js';
import { resetDatabase } from '../../../tests/helpers/db.js';
import { addToCart, createAddress, createCustomer, createProduct } from '../../../tests/helpers/factories.js';
import { prisma } from '../../lib/prisma.js';

const { app, gateway } = buildTestApp();

beforeEach(resetDatabase);

/** A customer with an address and 2 × ₹500 in the cart (5 in stock). */
async function readyToCheckout() {
  const customer = await createCustomer();
  const address = await createAddress(customer.user.id);
  const product = await createProduct({ price: 50_000, stockQuantity: 5 });
  await addToCart(customer.user.id, product.id, 2);
  return { ...customer, address, product };
}

async function checkout(cookie: string, addressId: string) {
  const res = await request(app).post('/api/checkout').set('Cookie', cookie).send({ addressId });
  expect(res.status).toBe(201);
  return res.body as { orderId: string; razorpayOrderId: string; amount: number };
}

function sendWebhook(body: string, signature: string, eventId: string) {
  return request(app)
    .post('/api/payments/webhook')
    .set('Content-Type', 'application/json')
    .set('x-razorpay-signature', signature)
    .set('x-razorpay-event-id', eventId)
    .send(body);
}

const stockOf = async (id: string) => (await prisma.product.findUniqueOrThrow({ where: { id } })).stockQuantity;
const orderOf = (id: string) =>
  prisma.order.findUniqueOrThrow({ where: { id }, include: { statusHistory: { orderBy: { createdAt: 'asc' } } } });

describe('POST /api/checkout', () => {
  it('requires login', async () => {
    expect((await request(app).post('/api/checkout').send({})).status).toBe(401);
  });

  it('creates a PENDING order with server-calculated totals, ignoring client amounts', async () => {
    const { cookie, address, product } = await readyToCheckout();

    const res = await request(app)
      .post('/api/checkout')
      .set('Cookie', cookie)
      .send({ addressId: address.id, amount: 1, totalAmount: 1, shippingAmount: 0 });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      amount: 100_000,
      currency: 'INR',
      keyId: 'rzp_test_fake',
      orderNumber: expect.stringMatching(/^RPK-\d{8}-0001$/),
    });

    const order = await prisma.order.findUniqueOrThrow({
      where: { id: res.body.orderId },
      include: { items: true, payments: true },
    });
    expect(order).toMatchObject({
      status: 'PENDING',
      paymentStatus: 'CREATED',
      subtotal: 100_000,
      shippingAmount: 0,
      totalAmount: 100_000,
    });
    expect(order.items[0]).toMatchObject({
      productId: product.id,
      productName: product.name,
      quantity: 2,
      unitPrice: 50_000,
      totalPrice: 100_000,
    });
    expect(order.payments[0]).toMatchObject({
      providerOrderId: res.body.razorpayOrderId,
      amount: 100_000,
      status: 'CREATED',
    });
    expect(order.shippingAddress).toMatchObject({ fullName: 'Priya Sharma', postalCode: '560001', country: 'IN' });
    expect(await stockOf(product.id)).toBe(5); // stock is only taken when payment is verified (D8)
  });

  it('adds shipping below ₹999', async () => {
    const { user, cookie } = await createCustomer();
    const address = await createAddress(user.id);
    await addToCart(user.id, (await createProduct({ price: 30_000 })).id, 1);
    expect((await checkout(cookie, address.id)).amount).toBe(37_900);
  });

  it('rejects an empty cart', async () => {
    const { user, cookie } = await createCustomer();
    const address = await createAddress(user.id);
    const res = await request(app).post('/api/checkout').set('Cookie', cookie).send({ addressId: address.id });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('CART_EMPTY');
  });

  it("rejects another user's address", async () => {
    const { cookie } = await readyToCheckout();
    const stranger = await createCustomer();
    const theirs = await createAddress(stranger.user.id);
    const res = await request(app).post('/api/checkout').set('Cookie', cookie).send({ addressId: theirs.id });
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('ADDRESS_NOT_FOUND');
  });

  it('rejects a cart with stock problems and creates no order', async () => {
    const { cookie, address, product } = await readyToCheckout();
    await prisma.product.update({ where: { id: product.id }, data: { stockQuantity: 1 } });

    const res = await request(app).post('/api/checkout').set('Cookie', cookie).send({ addressId: address.id });
    expect(res.status).toBe(409);
    expect(res.body.error).toMatchObject({
      code: 'CART_HAS_ISSUES',
      details: { items: [{ productId: product.id, available: 1 }] },
    });
    expect(await prisma.order.count()).toBe(0);
  });

  it('creates no order when the payment provider fails', async () => {
    const { cookie, address } = await readyToCheckout();
    gateway.failNextCreateOrder = true;
    const res = await request(app).post('/api/checkout').set('Cookie', cookie).send({ addressId: address.id });
    expect(res.status).toBe(502);
    expect(res.body.error.code).toBe('PAYMENT_PROVIDER_ERROR');
    expect(await prisma.order.count()).toBe(0);
  });
});

describe('POST /api/payments/verify', () => {
  it('confirms the order, takes stock and clears the cart', async () => {
    const { user, cookie, address, product } = await readyToCheckout();
    const session = await checkout(cookie, address.id);

    const res = await request(app)
      .post('/api/payments/verify')
      .set('Cookie', cookie)
      .send(gateway.pay(session.razorpayOrderId));

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ id: session.orderId, status: 'CONFIRMED', paymentStatus: 'PAID' });
    expect(res.body.statusHistory.map((e: { status: string }) => e.status)).toEqual(['PENDING', 'CONFIRMED']);
    expect(await stockOf(product.id)).toBe(3);
    expect(await prisma.cartItem.count({ where: { cart: { userId: user.id } } })).toBe(0);
  });

  it('is idempotent: verifying twice takes stock once', async () => {
    const { cookie, address, product } = await readyToCheckout();
    const session = await checkout(cookie, address.id);
    const body = gateway.pay(session.razorpayOrderId);

    expect((await request(app).post('/api/payments/verify').set('Cookie', cookie).send(body)).status).toBe(200);
    expect((await request(app).post('/api/payments/verify').set('Cookie', cookie).send(body)).status).toBe(200);
    expect(await stockOf(product.id)).toBe(3);
  });

  it('rejects a forged signature', async () => {
    const { cookie, address } = await readyToCheckout();
    const session = await checkout(cookie, address.id);
    const body = { ...gateway.pay(session.razorpayOrderId), signature: 'f'.repeat(64) };

    const res = await request(app).post('/api/payments/verify').set('Cookie', cookie).send(body);
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_PAYMENT_SIGNATURE');
    expect((await orderOf(session.orderId)).status).toBe('PENDING');
  });

  it('rejects a payment whose amount does not match the order', async () => {
    const { cookie, address } = await readyToCheckout();
    const session = await checkout(cookie, address.id);

    const res = await request(app)
      .post('/api/payments/verify')
      .set('Cookie', cookie)
      .send(gateway.pay(session.razorpayOrderId, { amount: 100 }));
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('PAYMENT_MISMATCH');
    expect((await orderOf(session.orderId)).paymentStatus).toBe('CREATED');
  });

  it('rejects a payment that was not completed', async () => {
    const { cookie, address } = await readyToCheckout();
    const session = await checkout(cookie, address.id);
    const res = await request(app)
      .post('/api/payments/verify')
      .set('Cookie', cookie)
      .send(gateway.pay(session.razorpayOrderId, { status: 'failed' }));
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('PAYMENT_NOT_COMPLETED');
  });

  it("does not let a customer verify someone else's order", async () => {
    const { cookie, address } = await readyToCheckout();
    const session = await checkout(cookie, address.id);
    const stranger = await createCustomer();

    const res = await request(app)
      .post('/api/payments/verify')
      .set('Cookie', stranger.cookie)
      .send(gateway.pay(session.razorpayOrderId));
    expect(res.status).toBe(404);
  });

  it('confirms but flags the order when stock ran out before payment (D8 race)', async () => {
    const { cookie, address, product } = await readyToCheckout();
    const session = await checkout(cookie, address.id);
    await prisma.product.update({ where: { id: product.id }, data: { stockQuantity: 1 } }); // someone else bought it

    const res = await request(app)
      .post('/api/payments/verify')
      .set('Cookie', cookie)
      .send(gateway.pay(session.razorpayOrderId));
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('CONFIRMED');
    expect((await orderOf(session.orderId)).needsAttention).toBe(true);
    expect(await stockOf(product.id)).toBe(1); // never negative
  });
});

describe('POST /api/payments/webhook', () => {
  it('rejects an invalid signature', async () => {
    const { body } = gateway.webhook('payment.captured', {
      id: 'pay_x',
      order_id: 'order_x',
      amount: 1,
      status: 'captured',
    });
    const res = await sendWebhook(body, 'a'.repeat(64), 'evt_1');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_WEBHOOK_SIGNATURE');
  });

  it('confirms a captured payment once, even if delivered twice and verified later', async () => {
    const { cookie, address, product } = await readyToCheckout();
    const session = await checkout(cookie, address.id);
    const browser = gateway.pay(session.razorpayOrderId);
    const { body, signature } = gateway.webhook('payment.captured', {
      id: browser.razorpayPaymentId,
      order_id: session.razorpayOrderId,
      amount: session.amount,
      status: 'captured',
    });

    const first = await sendWebhook(body, signature, 'evt_1');
    expect(first.body).toEqual({ received: true, result: 'processed' });
    const repeat = await sendWebhook(body, signature, 'evt_1');
    expect(repeat.status).toBe(200);
    expect(repeat.body.result).toBe('duplicate');

    expect((await request(app).post('/api/payments/verify').set('Cookie', cookie).send(browser)).status).toBe(200);
    expect((await orderOf(session.orderId)).status).toBe('CONFIRMED');
    expect(await stockOf(product.id)).toBe(3);
  });

  it('flags the order when the captured amount does not match', async () => {
    const { cookie, address } = await readyToCheckout();
    const session = await checkout(cookie, address.id);
    const { body, signature } = gateway.webhook('payment.captured', {
      id: 'pay_wrong',
      order_id: session.razorpayOrderId,
      amount: 1,
      status: 'captured',
    });

    expect((await sendWebhook(body, signature, 'evt_2')).status).toBe(200);
    const order = await orderOf(session.orderId);
    expect(order).toMatchObject({ status: 'PENDING', needsAttention: true });
  });

  it('marks a failed payment, and the customer can retry on the same order', async () => {
    const { cookie, address } = await readyToCheckout();
    const session = await checkout(cookie, address.id);
    const { body, signature } = gateway.webhook('payment.failed', {
      id: 'pay_failed1',
      order_id: session.razorpayOrderId,
      amount: session.amount,
      status: 'failed',
    });

    await sendWebhook(body, signature, 'evt_3');
    expect(await orderOf(session.orderId)).toMatchObject({ status: 'PAYMENT_FAILED', paymentStatus: 'FAILED' });

    const retry = await request(app).post(`/api/orders/${session.orderId}/pay`).set('Cookie', cookie);
    expect(retry.status).toBe(200);
    expect(retry.body).toMatchObject({
      orderId: session.orderId,
      razorpayOrderId: session.razorpayOrderId,
      amount: session.amount,
    });
    expect((await orderOf(session.orderId)).status).toBe('PENDING');

    const verified = await request(app)
      .post('/api/payments/verify')
      .set('Cookie', cookie)
      .send(gateway.pay(session.razorpayOrderId));
    expect(verified.body.statusHistory.map((e: { status: string }) => e.status)).toEqual([
      'PENDING',
      'PAYMENT_FAILED',
      'PENDING',
      'CONFIRMED',
    ]);
  });
});
