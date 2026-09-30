import type { Prisma } from "../generated/prisma/client.js";
import { prisma } from "./prisma.js";

type Tx = Prisma.TransactionClient;

function assertValidRating(rating: number): void {
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    throw new RangeError("Review rating must be an integer between 1 and 5");
  }
}

/** Recomputes Product.rating (avg, 1 decimal) and reviewCount from its reviews. */
export async function syncProductRating(productId: string, db: Tx = prisma): Promise<void> {
  const { _avg, _count } = await db.review.aggregate({
    where: { productId },
    _avg: { rating: true },
    _count: { _all: true },
  });
  const average = _avg.rating ?? 0;
  await db.product.update({
    where: { id: productId },
    data: {
      rating: Math.round(average * 10) / 10,
      reviewCount: _count._all,
    },
  });
}

export function createReview(input: {
  userId: string;
  productId: string;
  rating: number;
  comment?: string;
}) {
  assertValidRating(input.rating);
  return prisma.$transaction(async (tx) => {
    const review = await tx.review.create({ data: input });
    await syncProductRating(input.productId, tx);
    return review;
  });
}

export function updateReview(id: string, data: { rating?: number; comment?: string | null }) {
  if (data.rating !== undefined) assertValidRating(data.rating);
  return prisma.$transaction(async (tx) => {
    const review = await tx.review.update({ where: { id }, data });
    await syncProductRating(review.productId, tx);
    return review;
  });
}

export function deleteReview(id: string) {
  return prisma.$transaction(async (tx) => {
    const review = await tx.review.delete({ where: { id } });
    await syncProductRating(review.productId, tx);
    return review;
  });
}
