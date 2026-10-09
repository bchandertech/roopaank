import { MAX_PRODUCT_IMAGES, type ProductImage, type ReorderImagesInput } from '@roopaank/shared';
import { badRequest, conflict, notFound } from '../../lib/errors.js';
import { logger } from '../../lib/logger.js';
import { prisma } from '../../lib/prisma.js';
import { detectImageType, type ImageStorage } from '../../lib/storage.js';

const imageSelect = { id: true, url: true, altText: true, sortOrder: true } as const;

async function listImages(productId: string): Promise<ProductImage[]> {
  return prisma.productImage.findMany({
    where: { productId },
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    select: imageSelect,
  });
}

export async function addProductImage(
  productId: string,
  file: Buffer,
  altText: string,
  storage: ImageStorage,
): Promise<ProductImage> {
  const type = detectImageType(file);
  if (!type) throw badRequest('UNSUPPORTED_FILE_TYPE', 'Only JPG, PNG and WebP images are allowed');

  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { _count: { select: { images: true } } },
  });
  if (!product) throw notFound('PRODUCT_NOT_FOUND', 'Product not found');
  if (product._count.images >= MAX_PRODUCT_IMAGES) {
    throw conflict('IMAGE_LIMIT_REACHED', `A product can have at most ${MAX_PRODUCT_IMAGES} images`);
  }

  const url = await storage.save(file, type);
  try {
    const { _max } = await prisma.productImage.aggregate({ where: { productId }, _max: { sortOrder: true } });
    return await prisma.productImage.create({
      data: { productId, url, altText, sortOrder: (_max.sortOrder ?? -1) + 1 },
      select: imageSelect,
    });
  } catch (error) {
    await storage.remove(url); // don't leave an orphaned file behind
    throw error;
  }
}

export async function deleteProductImage(imageId: string, storage: ImageStorage): Promise<void> {
  const image = await prisma.productImage.findUnique({ where: { id: imageId } });
  if (!image) throw notFound('IMAGE_NOT_FOUND', 'Image not found');
  await prisma.productImage.delete({ where: { id: imageId } });
  // The DB row is the source of truth; a leftover file is harmless, so don't fail the request.
  await storage.remove(image.url).catch((err: unknown) => logger.warn({ err, imageId }, 'Could not remove image file'));
}

export async function reorderProductImages(productId: string, input: ReorderImagesInput): Promise<ProductImage[]> {
  if (!(await prisma.product.findUnique({ where: { id: productId }, select: { id: true } }))) {
    throw notFound('PRODUCT_NOT_FOUND', 'Product not found');
  }
  const current = await listImages(productId);
  const requested = new Set(input.imageIds);
  const sameSet =
    requested.size === input.imageIds.length &&
    requested.size === current.length &&
    current.every((image) => requested.has(image.id));
  if (!sameSet) {
    throw badRequest('INVALID_IMAGE_ORDER', 'Send every image id of this product exactly once');
  }
  await prisma.$transaction(
    input.imageIds.map((id, index) => prisma.productImage.update({ where: { id }, data: { sortOrder: index } })),
  );
  return listImages(productId);
}
