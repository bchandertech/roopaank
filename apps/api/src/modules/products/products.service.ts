import {
  type AdminProduct,
  type AdminProductListQuery,
  type CreateProductInput,
  discountPercent,
  type Paginated,
  type ProductDetail,
  type ProductListItem,
  type ProductListQuery,
  PRODUCT_SORTS,
  type UpdateProductInput,
} from '@roopaank/shared';
import type { Prisma } from '../../generated/prisma/client.js';
import { badRequest, conflict, notFound } from '../../lib/errors.js';
import { isUniqueViolation, prisma } from '../../lib/prisma.js';
import { firstFreeSlug, slugify } from '../../lib/slug.js';

const imageOrder = [{ sortOrder: 'asc' }, { createdAt: 'asc' }] satisfies Prisma.ProductImageOrderByWithRelationInput[];
const categorySummary = { select: { id: true, name: true, slug: true } } as const;

const listInclude = {
  category: categorySummary,
  images: { orderBy: imageOrder, take: 1, select: { url: true, altText: true } },
} satisfies Prisma.ProductInclude;

const detailInclude = {
  category: categorySummary,
  images: { orderBy: imageOrder, select: { id: true, url: true, altText: true, sortOrder: true } },
} satisfies Prisma.ProductInclude;

type ListRow = Prisma.ProductGetPayload<{ include: typeof listInclude }>;
type DetailRow = Prisma.ProductGetPayload<{ include: typeof detailInclude }>;

const SORT_ORDER: Record<(typeof PRODUCT_SORTS)[number], Prisma.ProductOrderByWithRelationInput[]> = {
  newest: [{ createdAt: 'desc' }, { id: 'desc' }],
  price_asc: [{ price: 'asc' }, { id: 'asc' }],
  price_desc: [{ price: 'desc' }, { id: 'asc' }],
};

/** A product is shown in the store only when it and its category are both active. */
const visibleInStore = { isActive: true, category: { isActive: true } } satisfies Prisma.ProductWhereInput;

const productNotFound = () => notFound('PRODUCT_NOT_FOUND', 'Product not found');
const slugTaken = () => conflict('SLUG_TAKEN', 'Another product already uses this slug');

function toListItem(p: ListRow): ProductListItem {
  return {
    id: p.id,
    name: p.name,
    slug: p.slug,
    price: p.price,
    compareAtPrice: p.compareAtPrice,
    discountPercent: discountPercent(p.price, p.compareAtPrice),
    material: p.material,
    stockQuantity: p.stockQuantity,
    isFeatured: p.isFeatured,
    category: p.category,
    image: p.images[0] ?? null,
  };
}

function toDetail(p: DetailRow): ProductDetail {
  return {
    ...toListItem({ ...p, images: p.images.slice(0, 1) }),
    description: p.description,
    colour: p.colour,
    size: p.size,
    weightGrams: p.weightGrams,
    careInstructions: p.careInstructions,
    images: p.images,
  };
}

function toAdminProduct(p: DetailRow): AdminProduct {
  return {
    ...toDetail(p),
    categoryId: p.categoryId,
    isActive: p.isActive,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  };
}

// ---- Storefront ----

export async function listProducts(query: ProductListQuery): Promise<Paginated<ProductListItem>> {
  const where: Prisma.ProductWhereInput = {
    ...visibleInStore,
    ...(query.category && { category: { isActive: true, slug: query.category } }),
    ...(query.featured !== undefined && { isFeatured: query.featured }),
    ...(query.q && {
      OR: [
        { name: { contains: query.q, mode: 'insensitive' } },
        { material: { contains: query.q, mode: 'insensitive' } },
        { category: { name: { contains: query.q, mode: 'insensitive' } } },
      ],
    }),
  };
  const [total, rows] = await prisma.$transaction([
    prisma.product.count({ where }),
    prisma.product.findMany({
      where,
      include: listInclude,
      orderBy: SORT_ORDER[query.sort],
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    }),
  ]);
  return { items: rows.map(toListItem), page: query.page, limit: query.limit, total };
}

export async function getProductBySlug(slug: string): Promise<ProductDetail> {
  const row = await prisma.product.findFirst({ where: { slug, ...visibleInStore }, include: detailInclude });
  if (!row) throw productNotFound();
  return toDetail(row);
}

// ---- Admin ----

export async function adminListProducts(query: AdminProductListQuery): Promise<Paginated<AdminProduct>> {
  const where: Prisma.ProductWhereInput = {
    ...(query.categoryId && { categoryId: query.categoryId }),
    ...(query.isActive !== undefined && { isActive: query.isActive }),
    ...(query.q && {
      OR: [
        { name: { contains: query.q, mode: 'insensitive' } },
        { slug: { contains: query.q, mode: 'insensitive' } },
      ],
    }),
  };
  const [total, rows] = await prisma.$transaction([
    prisma.product.count({ where }),
    prisma.product.findMany({
      where,
      include: detailInclude,
      orderBy: SORT_ORDER.newest,
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    }),
  ]);
  return { items: rows.map(toAdminProduct), page: query.page, limit: query.limit, total };
}

export async function adminGetProduct(id: string): Promise<AdminProduct> {
  const row = await prisma.product.findUnique({ where: { id }, include: detailInclude });
  if (!row) throw productNotFound();
  return toAdminProduct(row);
}

async function assertCategoryExists(categoryId: string): Promise<void> {
  if (!(await prisma.category.findUnique({ where: { id: categoryId }, select: { id: true } }))) {
    throw badRequest('INVALID_CATEGORY', 'Category does not exist');
  }
}

async function freeProductSlug(name: string): Promise<string> {
  const base = slugify(name);
  const taken = await prisma.product.findMany({ where: { slug: { startsWith: base } }, select: { slug: true } });
  return firstFreeSlug(base, new Set(taken.map((p) => p.slug)));
}

export async function createProduct(input: CreateProductInput): Promise<AdminProduct> {
  await assertCategoryExists(input.categoryId);
  const slug = input.slug ?? (await freeProductSlug(input.name));
  try {
    const row = await prisma.product.create({ data: { ...input, slug }, include: detailInclude });
    return toAdminProduct(row);
  } catch (error) {
    if (isUniqueViolation(error)) throw slugTaken();
    throw error;
  }
}

export async function updateProduct(id: string, input: UpdateProductInput): Promise<AdminProduct> {
  const existing = await prisma.product.findUnique({ where: { id }, select: { price: true, compareAtPrice: true } });
  if (!existing) throw productNotFound();
  if (input.categoryId) await assertCategoryExists(input.categoryId);

  // Validate against the values the product will have after the update, not just the input.
  const price = input.price ?? existing.price;
  const compareAtPrice = input.compareAtPrice === undefined ? existing.compareAtPrice : input.compareAtPrice;
  if (compareAtPrice !== null && compareAtPrice <= price) {
    throw badRequest('VALIDATION_ERROR', 'Some fields are invalid', {
      formErrors: [],
      fieldErrors: { compareAtPrice: ['Compare-at price must be greater than price'] },
    });
  }

  try {
    return toAdminProduct(await prisma.product.update({ where: { id }, data: input, include: detailInclude }));
  } catch (error) {
    if (isUniqueViolation(error)) throw slugTaken();
    throw error;
  }
}

/** Soft delete (SPEC §6): hidden from the store; past orders still reference it. */
export async function deactivateProduct(id: string): Promise<void> {
  const { count } = await prisma.product.updateMany({ where: { id }, data: { isActive: false } });
  if (count === 0) throw productNotFound();
}
