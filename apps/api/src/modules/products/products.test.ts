import request from 'supertest';
import { buildTestApp } from '../../../tests/helpers/app.js';
import { resetDatabase } from '../../../tests/helpers/db.js';
import { createCategory, createProduct } from '../../../tests/helpers/factories.js';
import { prisma } from '../../lib/prisma.js';

const { app } = buildTestApp();

beforeEach(resetDatabase);

describe('GET /api/categories', () => {
  it('lists only active categories', async () => {
    await createCategory({ name: 'Earrings', slug: 'earrings' });
    await createCategory({ name: 'Hidden', slug: 'hidden', isActive: false });

    const res = await request(app).get('/api/categories');
    expect(res.status).toBe(200);
    expect(res.body.map((c: { slug: string }) => c.slug)).toEqual(['earrings']);
  });
});

describe('GET /api/products', () => {
  it('lists only active products in active categories, with derived discount', async () => {
    const earrings = await createCategory({ slug: 'earrings' });
    const hiddenCategory = await createCategory({ slug: 'hidden', isActive: false });
    await createProduct({ slug: 'jhumka', categoryId: earrings.id, price: 129_900, compareAtPrice: 199_900 });
    await createProduct({ slug: 'inactive', categoryId: earrings.id, isActive: false });
    await createProduct({ slug: 'in-hidden-category', categoryId: hiddenCategory.id });

    const res = await request(app).get('/api/products');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ page: 1, limit: 12, total: 1 });
    expect(res.body.items[0]).toMatchObject({
      slug: 'jhumka',
      price: 129_900,
      compareAtPrice: 199_900,
      discountPercent: 35,
    });
  });

  it('filters by category, featured and search text', async () => {
    const earrings = await createCategory({ name: 'Earrings', slug: 'earrings' });
    const rings = await createCategory({ name: 'Finger Rings', slug: 'rings' });
    await createProduct({ slug: 'kundan-jhumka', name: 'Kundan Jhumka', categoryId: earrings.id, isFeatured: true });
    await createProduct({ slug: 'pearl-studs', name: 'Pearl Studs', categoryId: earrings.id });
    await createProduct({ slug: 'cocktail-ring', name: 'Cocktail Ring', categoryId: rings.id, isFeatured: true });

    const slugs = async (query: string) =>
      (await request(app).get(`/api/products?${query}`)).body.items.map((p: { slug: string }) => p.slug).sort();

    expect(await slugs('category=earrings')).toEqual(['kundan-jhumka', 'pearl-studs']);
    expect(await slugs('featured=true')).toEqual(['cocktail-ring', 'kundan-jhumka']);
    expect(await slugs('q=JHUMKA')).toEqual(['kundan-jhumka']);
    expect(await slugs('q=finger')).toEqual(['cocktail-ring']); // matches category name
    expect(await slugs('category=unknown')).toEqual([]);
  });

  it('sorts by price and paginates', async () => {
    const category = await createCategory();
    for (const [slug, price] of [
      ['a', 30_000],
      ['b', 10_000],
      ['c', 20_000],
    ] as const) {
      await createProduct({ slug, price, categoryId: category.id });
    }

    const asc = await request(app).get('/api/products?sort=price_asc&limit=2');
    expect(asc.body.items.map((p: { slug: string }) => p.slug)).toEqual(['b', 'c']);
    expect(asc.body.total).toBe(3);

    const page2 = await request(app).get('/api/products?sort=price_asc&limit=2&page=2');
    expect(page2.body.items.map((p: { slug: string }) => p.slug)).toEqual(['a']);

    const desc = await request(app).get('/api/products?sort=price_desc');
    expect(desc.body.items[0].slug).toBe('a');
  });

  it('rejects invalid query parameters', async () => {
    for (const query of ['sort=random', 'limit=1000', 'page=0', 'featured=yes']) {
      const res = await request(app).get(`/api/products?${query}`);
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    }
  });
});

describe('GET /api/products/:slug', () => {
  it('returns product details with images in display order', async () => {
    const product = await createProduct({ slug: 'jhumka' });
    await prisma.productImage.createMany({
      data: [
        { productId: product.id, url: 'http://img/2.jpg', altText: 'side', sortOrder: 1 },
        { productId: product.id, url: 'http://img/1.jpg', altText: 'front', sortOrder: 0 },
      ],
    });

    const res = await request(app).get('/api/products/jhumka');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      slug: 'jhumka',
      material: 'Brass alloy, gold-tone plating',
      image: { url: 'http://img/1.jpg' },
    });
    expect(res.body.images.map((i: { altText: string }) => i.altText)).toEqual(['front', 'side']);
  });

  it('404s for inactive or unknown products', async () => {
    await createProduct({ slug: 'gone', isActive: false });
    for (const slug of ['gone', 'never-existed']) {
      const res = await request(app).get(`/api/products/${slug}`);
      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('PRODUCT_NOT_FOUND');
    }
  });
});
