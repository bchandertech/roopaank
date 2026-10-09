import {
  type AddCartItemInput,
  amountToFreeShipping,
  type Cart,
  type CartItem,
  type CartItemIssue,
  lineTotal,
  MAX_CART_ITEM_QUANTITY,
  orderTotals,
  type UpdateCartItemInput,
} from '@roopaank/shared';
import type { Prisma } from '../../generated/prisma/client.js';
import { conflict, notFound } from '../../lib/errors.js';
import { prisma } from '../../lib/prisma.js';

const itemInclude = {
  product: {
    include: {
      category: { select: { isActive: true } },
      images: { orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }], take: 1, select: { url: true, altText: true } },
    },
  },
} satisfies Prisma.CartItemInclude;

type ItemRow = Prisma.CartItemGetPayload<{ include: typeof itemInclude }>;

function issueFor(item: ItemRow): CartItemIssue | null {
  const { product } = item;
  if (!product.isActive || !product.category.isActive) return 'UNAVAILABLE';
  if (product.stockQuantity === 0) return 'OUT_OF_STOCK';
  if (product.stockQuantity < item.quantity) return 'INSUFFICIENT_STOCK';
  return null;
}

/** Prices always come from the Product table right now — the cart stores no prices (SPEC §6). */
function toCart(rows: ItemRow[]): Cart {
  const items: CartItem[] = rows.map((row) => ({
    id: row.id,
    quantity: row.quantity,
    product: {
      id: row.product.id,
      name: row.product.name,
      slug: row.product.slug,
      price: row.product.price,
      compareAtPrice: row.product.compareAtPrice,
      stockQuantity: row.product.stockQuantity,
      image: row.product.images[0] ?? null,
    },
    lineTotal: lineTotal(row.product.price, row.quantity),
    issue: issueFor(row),
  }));
  const buyable = items.filter((item) => item.issue === null);
  const totals = orderTotals(buyable.map((item) => ({ unitPrice: item.product.price, quantity: item.quantity })));
  return {
    items,
    itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
    subtotal: totals.subtotal,
    shippingAmount: totals.shippingAmount,
    totalAmount: totals.totalAmount,
    amountToFreeShipping: amountToFreeShipping(totals.subtotal),
    hasIssues: buyable.length !== items.length,
  };
}

async function loadItems(cartId: string): Promise<ItemRow[]> {
  return prisma.cartItem.findMany({ where: { cartId }, include: itemInclude, orderBy: { createdAt: 'asc' } });
}

async function cartIdFor(userId: string): Promise<string> {
  const cart = await prisma.cart.upsert({ where: { userId }, update: {}, create: { userId }, select: { id: true } });
  return cart.id;
}

export async function getCart(userId: string): Promise<Cart> {
  const cart = await prisma.cart.findUnique({ where: { userId }, select: { id: true } });
  return toCart(cart ? await loadItems(cart.id) : []);
}

/** Throws unless `quantity` of the product can be bought right now. */
async function assertPurchasable(productId: string, quantity: number): Promise<void> {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { isActive: true, stockQuantity: true, category: { select: { isActive: true } } },
  });
  if (!product || !product.isActive || !product.category.isActive) {
    throw notFound('PRODUCT_NOT_FOUND', 'Product not found');
  }
  if (quantity > MAX_CART_ITEM_QUANTITY) {
    throw conflict('QUANTITY_LIMIT_EXCEEDED', `You can buy at most ${MAX_CART_ITEM_QUANTITY} of a product`, {
      max: MAX_CART_ITEM_QUANTITY,
    });
  }
  if (quantity > product.stockQuantity) {
    throw conflict('INSUFFICIENT_STOCK', `Only ${product.stockQuantity} left in stock`, {
      available: product.stockQuantity,
    });
  }
}

export async function addItem(userId: string, input: AddCartItemInput): Promise<Cart> {
  const cartId = await cartIdFor(userId);
  const existing = await prisma.cartItem.findUnique({
    where: { cartId_productId: { cartId, productId: input.productId } },
    select: { quantity: true },
  });
  const quantity = (existing?.quantity ?? 0) + input.quantity;
  await assertPurchasable(input.productId, quantity);
  await prisma.cartItem.upsert({
    where: { cartId_productId: { cartId, productId: input.productId } },
    update: { quantity },
    create: { cartId, productId: input.productId, quantity },
  });
  return toCart(await loadItems(cartId));
}

/** Finds a line in this user's cart. Another user's item is reported as not found (no leaking). */
async function findOwnItem(userId: string, itemId: string) {
  const item = await prisma.cartItem.findFirst({ where: { id: itemId, cart: { userId } } });
  if (!item) throw notFound('CART_ITEM_NOT_FOUND', 'Cart item not found');
  return item;
}

export async function updateItem(userId: string, itemId: string, input: UpdateCartItemInput): Promise<Cart> {
  const item = await findOwnItem(userId, itemId);
  await assertPurchasable(item.productId, input.quantity);
  await prisma.cartItem.update({ where: { id: item.id }, data: { quantity: input.quantity } });
  return toCart(await loadItems(item.cartId));
}

export async function removeItem(userId: string, itemId: string): Promise<Cart> {
  const item = await findOwnItem(userId, itemId);
  await prisma.cartItem.delete({ where: { id: item.id } });
  return toCart(await loadItems(item.cartId));
}
