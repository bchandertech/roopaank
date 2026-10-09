import request from 'supertest';
import { buildTestApp } from '../../../tests/helpers/app.js';
import { resetDatabase } from '../../../tests/helpers/db.js';
import { addToCart, createCustomer, createProduct } from '../../../tests/helpers/factories.js';
import { prisma } from '../../lib/prisma.js';

const { app } = buildTestApp();

beforeEach(resetDatabase);

describe('cart', () => {
  it('requires login', async () => {
    expect((await request(app).get('/api/cart')).status).toBe(401);
    expect((await request(app).post('/api/cart/items').send({})).status).toBe(401);
  });

  it('starts empty', async () => {
    const { cookie } = await createCustomer();
    const res = await request(app).get('/api/cart').set('Cookie', cookie);
    expect(res.body).toMatchObject({ items: [], itemCount: 0, subtotal: 0, shippingAmount: 0, totalAmount: 0 });
  });

  it('adds items using the server price, ignoring any client-sent price', async () => {
    const { cookie } = await createCustomer();
    const product = await createProduct({ price: 50_000 });

    const res = await request(app)
      .post('/api/cart/items')
      .set('Cookie', cookie)
      .send({ productId: product.id, quantity: 2, price: 1, totalAmount: 1 });

    expect(res.status).toBe(200);
    expect(res.body.items[0]).toMatchObject({
      quantity: 2,
      lineTotal: 100_000,
      issue: null,
      product: { price: 50_000 },
    });
    // ₹1,000 ≥ ₹999, so shipping is free.
    expect(res.body).toMatchObject({
      subtotal: 100_000,
      shippingAmount: 0,
      totalAmount: 100_000,
      amountToFreeShipping: 0,
    });
  });

  it('adds the flat shipping fee below ₹999 and merges repeated adds', async () => {
    const { cookie } = await createCustomer();
    const product = await createProduct({ price: 30_000 });

    await request(app).post('/api/cart/items').set('Cookie', cookie).send({ productId: product.id });
    const res = await request(app).post('/api/cart/items').set('Cookie', cookie).send({ productId: product.id });

    expect(res.body.items).toHaveLength(1);
    expect(res.body).toMatchObject({
      itemCount: 2,
      subtotal: 60_000,
      shippingAmount: 7_900,
      totalAmount: 67_900,
      amountToFreeShipping: 39_900,
    });
  });

  it('refuses more than the available stock', async () => {
    const { cookie } = await createCustomer();
    const product = await createProduct({ stockQuantity: 2 });

    const res = await request(app)
      .post('/api/cart/items')
      .set('Cookie', cookie)
      .send({ productId: product.id, quantity: 3 });
    expect(res.status).toBe(409);
    expect(res.body.error).toMatchObject({ code: 'INSUFFICIENT_STOCK', details: { available: 2 } });
  });

  it('refuses inactive or unknown products', async () => {
    const { cookie } = await createCustomer();
    const inactive = await createProduct({ isActive: false });
    for (const productId of [inactive.id, 'cm0000000000000000000000']) {
      const res = await request(app).post('/api/cart/items').set('Cookie', cookie).send({ productId });
      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('PRODUCT_NOT_FOUND');
    }
  });

  it('enforces the per-line quantity limit across repeated adds', async () => {
    const { cookie } = await createCustomer();
    const product = await createProduct({ stockQuantity: 100 });
    await request(app).post('/api/cart/items').set('Cookie', cookie).send({ productId: product.id, quantity: 10 });
    const res = await request(app)
      .post('/api/cart/items')
      .set('Cookie', cookie)
      .send({ productId: product.id, quantity: 1 });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('QUANTITY_LIMIT_EXCEEDED');
  });

  it('updates and removes lines', async () => {
    const { user, cookie } = await createCustomer();
    const product = await createProduct({ price: 10_000 });
    const item = await addToCart(user.id, product.id, 1);

    const updated = await request(app).patch(`/api/cart/items/${item.id}`).set('Cookie', cookie).send({ quantity: 3 });
    expect(updated.status).toBe(200);
    expect(updated.body.items[0].quantity).toBe(3);

    const removed = await request(app).delete(`/api/cart/items/${item.id}`).set('Cookie', cookie);
    expect(removed.status).toBe(200);
    expect(removed.body.items).toEqual([]);
  });

  it("hides another user's cart lines (404, not 403)", async () => {
    const owner = await createCustomer();
    const other = await createCustomer();
    const item = await addToCart(owner.user.id, (await createProduct()).id, 1);

    for (const req of [
      request(app).patch(`/api/cart/items/${item.id}`).set('Cookie', other.cookie).send({ quantity: 2 }),
      request(app).delete(`/api/cart/items/${item.id}`).set('Cookie', other.cookie),
    ]) {
      const res = await req;
      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('CART_ITEM_NOT_FOUND');
    }
    expect((await prisma.cartItem.findUniqueOrThrow({ where: { id: item.id } })).quantity).toBe(1);
  });

  it('reflects current prices and flags lines that can no longer be bought', async () => {
    const { user, cookie } = await createCustomer();
    const repriced = await createProduct({ price: 10_000 });
    const soldOut = await createProduct({ stockQuantity: 5 });
    await addToCart(user.id, repriced.id, 1);
    await addToCart(user.id, soldOut.id, 2);
    await prisma.product.update({ where: { id: repriced.id }, data: { price: 12_000 } });
    await prisma.product.update({ where: { id: soldOut.id }, data: { stockQuantity: 0 } });

    const res = await request(app).get('/api/cart').set('Cookie', cookie);
    expect(res.body.items.map((i: { issue: string | null }) => i.issue)).toEqual([null, 'OUT_OF_STOCK']);
    expect(res.body).toMatchObject({ subtotal: 12_000, hasIssues: true });
  });
});
