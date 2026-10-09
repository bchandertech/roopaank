import request from 'supertest';
import { buildTestApp } from '../../../tests/helpers/app.js';
import { resetDatabase } from '../../../tests/helpers/db.js';
import { createAdmin, createCustomer, createOrder, createProduct } from '../../../tests/helpers/factories.js';
import { prisma } from '../../lib/prisma.js';
import { DAY_MS } from '../../lib/time.js';

const { app } = buildTestApp();

beforeEach(resetDatabase);

describe('customer orders', () => {
  it('lists only the customer’s own orders, newest first, paginated', async () => {
    const { user, cookie } = await createCustomer();
    const other = await createCustomer();
    await createOrder(user.id);
    await createOrder(user.id);
    await createOrder(other.user.id);

    const res = await request(app).get('/api/orders?limit=1').set('Cookie', cookie);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ total: 2, limit: 1, page: 1 });
    expect(res.body.items[0]).toMatchObject({ status: 'CONFIRMED', itemCount: 1 });
  });

  it("returns 404 for someone else's order", async () => {
    const { cookie } = await createCustomer();
    const other = await createCustomer();
    const order = await createOrder(other.user.id);

    const res = await request(app).get(`/api/orders/${order.id}`).set('Cookie', cookie);
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('ORDER_NOT_FOUND');
  });

  it('cannot re-pay a confirmed order', async () => {
    const { user, cookie } = await createCustomer();
    const order = await createOrder(user.id, { status: 'CONFIRMED' });
    const res = await request(app).post(`/api/orders/${order.id}/pay`).set('Cookie', cookie);
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('ORDER_NOT_PAYABLE');
  });
});

describe('admin orders', () => {
  it('requires an admin', async () => {
    const { cookie } = await createCustomer();
    expect((await request(app).get('/api/admin/orders')).status).toBe(401);
    expect((await request(app).get('/api/admin/orders').set('Cookie', cookie)).status).toBe(403);
  });

  it('lists all orders with filters', async () => {
    const admin = await createAdmin();
    const { user } = await createCustomer();
    await createOrder(user.id, { status: 'CONFIRMED' });
    await createOrder(user.id, { status: 'SHIPPED', needsAttention: true });

    const shipped = await request(app).get('/api/admin/orders?status=SHIPPED').set('Cookie', admin.cookie);
    expect(shipped.body.total).toBe(1);
    expect(shipped.body.items[0]).toMatchObject({ status: 'SHIPPED', customer: { id: user.id } });

    const flagged = await request(app).get('/api/admin/orders?needsAttention=true').set('Cookie', admin.cookie);
    expect(flagged.body.total).toBe(1);
  });

  it('moves an order along allowed transitions and records history', async () => {
    const admin = await createAdmin();
    const { user } = await createCustomer();
    const order = await createOrder(user.id, { status: 'CONFIRMED' });

    for (const status of ['PROCESSING', 'SHIPPED', 'OUT_FOR_DELIVERY', 'DELIVERED']) {
      const res = await request(app).patch(`/api/admin/orders/${order.id}/status`).set('Cookie', admin.cookie).send({ status });
      expect(res.status).toBe(200);
      expect(res.body.status).toBe(status);
    }
    const history = await prisma.orderStatusHistory.findMany({ where: { orderId: order.id }, orderBy: { createdAt: 'asc' } });
    expect(history.map((h) => h.status)).toEqual(['CONFIRMED', 'PROCESSING', 'SHIPPED', 'OUT_FOR_DELIVERY', 'DELIVERED']);
  });

  it('rejects transitions outside the state machine with 409', async () => {
    const admin = await createAdmin();
    const { user } = await createCustomer();
    const confirmed = await createOrder(user.id, { status: 'CONFIRMED' });
    const pending = await createOrder(user.id, { status: 'PENDING' });

    const skip = await request(app).patch(`/api/admin/orders/${confirmed.id}/status`).set('Cookie', admin.cookie).send({ status: 'DELIVERED' });
    expect(skip.status).toBe(409);
    expect(skip.body.error).toMatchObject({ code: 'INVALID_STATUS_TRANSITION', details: { allowed: ['PROCESSING', 'CANCELLED'] } });

    // Only a verified payment may confirm an order.
    const fakePaid = await request(app).patch(`/api/admin/orders/${pending.id}/status`).set('Cookie', admin.cookie).send({ status: 'CONFIRMED' });
    expect(fakePaid.status).toBe(409);
  });

  it('returns stock when an order is cancelled', async () => {
    const admin = await createAdmin();
    const { user } = await createCustomer();
    const product = await createProduct({ stockQuantity: 4 });
    const order = await createOrder(user.id, { status: 'PROCESSING', productId: product.id, quantity: 2 });

    const res = await request(app).patch(`/api/admin/orders/${order.id}/status`).set('Cookie', admin.cookie).send({ status: 'CANCELLED' });
    expect(res.status).toBe(200);
    expect((await prisma.product.findUniqueOrThrow({ where: { id: product.id } })).stockQuantity).toBe(6);
  });

  it('allows a return only within 7 days of delivery', async () => {
    const admin = await createAdmin();
    const { user } = await createCustomer();
    const recent = await createOrder(user.id, { status: 'DELIVERED' });
    const old = await createOrder(user.id, { status: 'DELIVERED' });
    await prisma.orderStatusHistory.updateMany({ where: { orderId: old.id }, data: { createdAt: new Date(Date.now() - 8 * DAY_MS) } });

    const ok = await request(app).patch(`/api/admin/orders/${recent.id}/status`).set('Cookie', admin.cookie).send({ status: 'RETURN_REQUESTED' });
    expect(ok.status).toBe(200);

    const late = await request(app).patch(`/api/admin/orders/${old.id}/status`).set('Cookie', admin.cookie).send({ status: 'RETURN_REQUESTED' });
    expect(late.status).toBe(409);
    expect(late.body.error.code).toBe('RETURN_WINDOW_EXPIRED');
  });

  it('records a refund on the order and payment', async () => {
    const admin = await createAdmin();
    const { user } = await createCustomer();
    const order = await createOrder(user.id, { status: 'RETURNED' });

    const res = await request(app).patch(`/api/admin/orders/${order.id}/status`).set('Cookie', admin.cookie).send({ status: 'REFUNDED' });
    expect(res.body).toMatchObject({ status: 'REFUNDED', paymentStatus: 'REFUNDED' });
    expect(res.body.payments[0].status).toBe('REFUNDED');
  });

  it('validates the requested status', async () => {
    const admin = await createAdmin();
    const { user } = await createCustomer();
    const order = await createOrder(user.id);
    const res = await request(app).patch(`/api/admin/orders/${order.id}/status`).set('Cookie', admin.cookie).send({ status: 'TELEPORTED' });
    expect(res.status).toBe(400);
  });
});
