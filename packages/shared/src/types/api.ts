// Response contracts of the API (SPEC §7). Money fields are integer paise; dates are ISO strings.
import type { OrderStatus, PaymentStatus, Role } from './enums.js';

export interface ApiErrorBody {
  error: { code: string; message: string; details?: unknown };
}

export interface Paginated<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
}

export interface PublicUser {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: Role;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
}

export interface ProductImage {
  id: string;
  url: string;
  altText: string;
  sortOrder: number;
}

export interface ProductListItem {
  id: string;
  name: string;
  slug: string;
  price: number;
  compareAtPrice: number | null;
  discountPercent: number | null;
  material: string;
  stockQuantity: number;
  isFeatured: boolean;
  category: Pick<Category, 'id' | 'name' | 'slug'>;
  image: Pick<ProductImage, 'url' | 'altText'> | null;
}

export interface ProductDetail extends Omit<ProductListItem, 'image'> {
  description: string;
  colour: string | null;
  size: string | null;
  weightGrams: number | null;
  careInstructions: string | null;
  images: ProductImage[];
}

export interface AdminCategory extends Category {
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AdminProduct extends ProductDetail {
  categoryId: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Why a cart line can't be bought right now; null when it can. */
export type CartItemIssue = 'UNAVAILABLE' | 'OUT_OF_STOCK' | 'INSUFFICIENT_STOCK';

export interface CartItem {
  id: string;
  quantity: number;
  product: Pick<
    ProductListItem,
    'id' | 'name' | 'slug' | 'price' | 'compareAtPrice' | 'stockQuantity' | 'image'
  >;
  lineTotal: number;
  issue: CartItemIssue | null;
}

export interface Cart {
  items: CartItem[];
  itemCount: number;
  /** Totals cover only lines without an issue. */
  subtotal: number;
  shippingAmount: number;
  totalAmount: number;
  amountToFreeShipping: number;
  hasIssues: boolean;
}

export interface Address {
  id: string;
  fullName: string;
  phone: string;
  addressLine1: string;
  addressLine2: string | null;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  isDefault: boolean;
}

export type ShippingAddressSnapshot = Omit<Address, 'id' | 'isDefault'>;

/** What the web app needs to open Razorpay Checkout. */
export interface PaymentSession {
  orderId: string;
  orderNumber: string;
  razorpayOrderId: string;
  amount: number;
  currency: 'INR';
  keyId: string;
}

export interface OrderSummary {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  totalAmount: number;
  itemCount: number;
  createdAt: string;
}

export interface OrderItem {
  id: string;
  productId: string;
  productName: string;
  productImageUrl: string | null;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface OrderStatusEvent {
  status: OrderStatus;
  createdAt: string;
}

export interface OrderDetail extends OrderSummary {
  subtotal: number;
  shippingAmount: number;
  discountAmount: number;
  shippingAddress: ShippingAddressSnapshot;
  items: OrderItem[];
  statusHistory: OrderStatusEvent[];
}

export interface AdminOrderSummary extends OrderSummary {
  needsAttention: boolean;
  customer: { id: string; name: string; email: string };
}

export interface AdminOrderDetail extends OrderDetail {
  needsAttention: boolean;
  customer: { id: string; name: string; email: string; phone: string | null };
  payments: {
    id: string;
    providerOrderId: string;
    providerPaymentId: string | null;
    amount: number;
    status: PaymentStatus;
  }[];
}

export interface AdminCustomer {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  orderCount: number;
}

export interface AdminDashboard {
  ordersByStatus: Record<OrderStatus, number>;
  ordersToday: number;
  needsAttentionCount: number;
  activeProductCount: number;
  lowStockProducts: { id: string; name: string; slug: string; stockQuantity: number }[];
}
