// Admin catalog management, customers and dashboard (SPEC §7.8).
import { existsSync } from 'node:fs';
import path from 'node:path';
import request from 'supertest';
import { buildTestApp } from '../../../tests/helpers/app.js';
import { resetDatabase } from '../../../tests/helpers/db.js';
import { createAdmin, createCategory, createCustomer, createOrder, createProduct } from '../../../tests/helpers/factories.js';
import { config } from '../../config/env.js';

const { app } = buildTestApp();

beforeEach(resetDatabase);

const PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(32)]);
const fileOnDisk = (url: string) =>
  path.join(path.resolve(config.UPLOAD_DIR), url.slice(config.PUBLIC_UPLOADS_URL.length + 1));

describe('admin authorization', () => {
  it.each([
    ['get', '/api/admin/dashboard'],
    ['get', '/api/admin/products'],
    ['post', '/api/admin/products'],
    ['get', '/api/admin/categories'],
    ['get', '/api/admin/customers'],
  ] as const)('%s %s needs login (401) and the ADMIN role (403)', async (method, url) => {
    const { cookie } = await createCustomer();
    expect((await request(app)[method](url)).status).toBe(401);
    expect((await request(app)[method](url).set('Cookie', cookie)).status).toBe(403);
  });
});

describe('admin categories', () => {
  it('creates with a generated slug, rejects duplicates and deactivates', async () => {
    const { cookie } = await createAdmin();

    const created = await request(app).post('/api/admin/categories').set('Cookie', cookie).send({ name: 'Necklace Sets' });
    expect(created.status).toBe(201);
    expect(created.body).toMatchObject({ slug: 'necklace-sets', isActive: true, description: '' });

    const duplicate = await request(app).post('/api/admin/categories').set('Cookie', cookie).send({ name: 'Necklace Sets' });
    expect(duplicate.status).toBe(409);
    expect(duplicate.body.error.code).toBe('SLUG_TAKEN');

    const renamed = await request(app).patch(`/api/admin/categories/${created.body.id}`).set('Cookie', cookie).send({ name: 'Sets' });
    expect(renamed.body.name).toBe('Sets');

    expect((await request(app).delete(`/api/admin/categories/${created.body.id}`).set('Cookie', cookie)).status).toBe(204);
    expect((await request(app).get('/api/categories')).body).toEqual([]);
    expect((await request(app).get('/api/admin/categories').set('Cookie', cookie)).body[0].isActive).toBe(false);
  });
});

describe('admin products', () => {
  it('creates a product with a unique slug and server-side validation', async () => {
    const { cookie } = await createAdmin();
    const category = await createCategory();
    const base = { name: 'Kundan Jhumka', description: 'Imitation', categoryId: category.id, price: 129_900, material: 'Brass alloy' };

    const first = await request(app).post('/api/admin/products').set('Cookie', cookie).send(base);
    expect(first.status).toBe(201);
    expect(first.body).toMatchObject({ slug: 'kundan-jhumka', stockQuantity: 0, isActive: true, compareAtPrice: null });

    const second = await request(app).post('/api/admin/products').set('Cookie', cookie).send(base);
    expect(second.body.slug).toBe('kundan-jhumka-2');

    const badPrice = await request(app).post('/api/admin/products').set('Cookie', cookie).send({ ...base, compareAtPrice: 100 });
    expect(badPrice.status).toBe(400);
    expect(badPrice.body.error.details.fieldErrors.compareAtPrice).toBeDefined();

    const badCategory = await request(app)
      .post('/api/admin/products')
      .set('Cookie', cookie)
      .send({ ...base, categoryId: 'cm0000000000000000000000' });
    expect(badCategory.status).toBe(400);
    expect(badCategory.body.error.code).toBe('INVALID_CATEGORY');
  });

  it('checks compare-at price against the stored price on partial updates', async () => {
    const { cookie } = await createAdmin();
    const product = await createProduct({ price: 50_000 });

    const res = await request(app).patch(`/api/admin/products/${product.id}`).set('Cookie', cookie).send({ compareAtPrice: 40_000 });
    expect(res.status).toBe(400);

    const ok = await request(app).patch(`/api/admin/products/${product.id}`).set('Cookie', cookie).send({ compareAtPrice: 60_000, stockQuantity: 7 });
    expect(ok.body).toMatchObject({ compareAtPrice: 60_000, stockQuantity: 7, discountPercent: 17 });
  });

  it('deactivating hides a product from the store but not from admins', async () => {
    const { cookie } = await createAdmin();
    const product = await createProduct({ slug: 'to-hide' });

    expect((await request(app).delete(`/api/admin/products/${product.id}`).set('Cookie', cookie)).status).toBe(204);
    expect((await request(app).get('/api/products/to-hide')).status).toBe(404);
    const adminView = await request(app).get(`/api/admin/products/${product.id}`).set('Cookie', cookie);
    expect(adminView.body.isActive).toBe(false);

    const inactiveList = await request(app).get('/api/admin/products?isActive=false').set('Cookie', cookie);
    expect(inactiveList.body.total).toBe(1);
  });
});

describe('admin product images', () => {
  it('uploads, reorders and deletes images', async () => {
    const { cookie } = await createAdmin();
    const product = await createProduct();
    const upload = (altText: string) =>
      request(app)
        .post(`/api/admin/products/${product.id}/images`)
        .set('Cookie', cookie)
        .field('altText', altText)
        .attach('image', PNG, { filename: 'photo.png', contentType: 'image/png' });

    const first = await upload('Front');
    expect(first.status).toBe(201);
    expect(first.body).toMatchObject({ altText: 'Front', sortOrder: 0, url: expect.stringMatching(/\/uploads\/products\/[\w-]+\.png$/) });
    expect(existsSync(fileOnDisk(first.body.url))).toBe(true);
    const second = await upload('Side');
    expect(second.body.sortOrder).toBe(1);

    const reordered = await request(app)
      .put(`/api/admin/products/${product.id}/images/order`)
      .set('Cookie', cookie)
      .send({ imageIds: [second.body.id, first.body.id] });
    expect(reordered.body.map((i: { altText: string }) => i.altText)).toEqual(['Side', 'Front']);

    const incomplete = await request(app)
      .put(`/api/admin/products/${product.id}/images/order`)
      .set('Cookie', cookie)
      .send({ imageIds: [second.body.id] });
    expect(incomplete.status).toBe(400);

    expect((await request(app).delete(`/api/admin/images/${first.body.id}`).set('Cookie', cookie)).status).toBe(204);
    expect(existsSync(fileOnDisk(first.body.url))).toBe(false);
  });

  it('rejects files that are not real images, even with an image name and MIME type', async () => {
    const { cookie } = await createAdmin();
    const product = await createProduct();
    const res = await request(app)
      .post(`/api/admin/products/${product.id}/images`)
      .set('Cookie', cookie)
      .field('altText', 'Fake')
      .attach('image', Buffer.from('<script>alert(1)</script>'), { filename: 'evil.png', contentType: 'image/png' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('UNSUPPORTED_FILE_TYPE');
  });

  it('requires alt text and rejects oversized files', async () => {
    const { cookie } = await createAdmin();
    const product = await createProduct();

    const noAlt = await request(app)
      .post(`/api/admin/products/${product.id}/images`)
      .set('Cookie', cookie)
      .attach('image', PNG, { filename: 'photo.png', contentType: 'image/png' });
    expect(noAlt.status).toBe(400);

    const huge = await request(app)
      .post(`/api/admin/products/${product.id}/images`)
      .set('Cookie', cookie)
      .field('altText', 'Big')
      .attach('image', Buffer.concat([PNG, Buffer.alloc(6 * 1024 * 1024)]), { filename: 'big.png', contentType: 'image/png' });
    expect(huge.status).toBe(413);
    expect(huge.body.error.code).toBe('FILE_TOO_LARGE');
  });
});

describe('admin customers and dashboard', () => {
  it('lists customers with order counts and no sensitive fields', async () => {
    const admin = await createAdmin();
    const { user } = await createCustomer();
    await createOrder(user.id);

    const res = await request(app).get('/api/admin/customers').set('Cookie', admin.cookie);
    expect(res.body.total).toBe(1); // admins are not listed
    expect(res.body.items[0]).toEqual({ id: user.id, name: user.name, email: user.email, createdAt: expect.any(String), orderCount: 1 });
  });

  it('summarises orders and stock', async () => {
    const admin = await createAdmin();
    const { user } = await createCustomer();
    const lowStock = await createProduct({ stockQuantity: 2 });
    await createProduct({ stockQuantity: 50 });
    await createOrder(user.id, { status: 'CONFIRMED', productId: lowStock.id });
    await createOrder(user.id, { status: 'PENDING', productId: lowStock.id, needsAttention: true });

    const res = await request(app).get('/api/admin/dashboard').set('Cookie', admin.cookie);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ ordersToday: 1, needsAttentionCount: 1, activeProductCount: 2 });
    expect(res.body.ordersByStatus).toMatchObject({ CONFIRMED: 1, PENDING: 1, SHIPPED: 0 });
    expect(res.body.lowStockProducts.map((p: { id: string }) => p.id)).toEqual([lowStock.id]);
  });
});
