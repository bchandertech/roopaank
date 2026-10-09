import type { AdminCategory, Category, CreateCategoryInput, UpdateCategoryInput } from '@roopaank/shared';
import type { Category as CategoryRow } from '../../generated/prisma/client.js';
import { conflict, notFound } from '../../lib/errors.js';
import { isUniqueViolation, prisma } from '../../lib/prisma.js';
import { slugify } from '../../lib/slug.js';

const toCategory = (c: CategoryRow): Category => ({
  id: c.id,
  name: c.name,
  slug: c.slug,
  description: c.description,
});

const toAdminCategory = (c: CategoryRow): AdminCategory => ({
  ...toCategory(c),
  isActive: c.isActive,
  createdAt: c.createdAt.toISOString(),
  updatedAt: c.updatedAt.toISOString(),
});

const categoryNotFound = () => notFound('CATEGORY_NOT_FOUND', 'Category not found');
const slugTaken = () => conflict('SLUG_TAKEN', 'Another category already uses this slug');

// Display order is creation order (the seed inserts them in SPEC §1.5 order).
export async function listCategories(): Promise<Category[]> {
  const rows = await prisma.category.findMany({ where: { isActive: true }, orderBy: { createdAt: 'asc' } });
  return rows.map(toCategory);
}

export async function adminListCategories(): Promise<AdminCategory[]> {
  const rows = await prisma.category.findMany({ orderBy: { createdAt: 'asc' } });
  return rows.map(toAdminCategory);
}

export async function createCategory(input: CreateCategoryInput): Promise<AdminCategory> {
  try {
    const row = await prisma.category.create({
      data: { ...input, slug: input.slug ?? slugify(input.name) },
    });
    return toAdminCategory(row);
  } catch (error) {
    if (isUniqueViolation(error)) throw slugTaken();
    throw error;
  }
}

export async function updateCategory(id: string, input: UpdateCategoryInput): Promise<AdminCategory> {
  if (!(await prisma.category.findUnique({ where: { id }, select: { id: true } }))) throw categoryNotFound();
  try {
    return toAdminCategory(await prisma.category.update({ where: { id }, data: input }));
  } catch (error) {
    if (isUniqueViolation(error)) throw slugTaken();
    throw error;
  }
}

/** Soft delete (SPEC §6): products in it disappear from the store but orders keep their history. */
export async function deactivateCategory(id: string): Promise<void> {
  const { count } = await prisma.category.updateMany({ where: { id }, data: { isActive: false } });
  if (count === 0) throw categoryNotFound();
}
