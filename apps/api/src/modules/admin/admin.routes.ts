import { Router } from 'express';
import multer from 'multer';
import {
  adminCustomerListQuerySchema,
  adminOrderListQuerySchema,
  adminProductListQuerySchema,
  createCategorySchema,
  createProductSchema,
  productImageMetaSchema,
  reorderImagesSchema,
  updateCategorySchema,
  updateOrderStatusSchema,
  updateProductSchema,
} from '@roopaank/shared';
import { requireAdmin } from '../../middleware/auth.js';
import { badRequest } from '../../lib/errors.js';
import type { ImageStorage } from '../../lib/storage.js';
import { idParamSchema, parse } from '../../lib/validate.js';
import * as categories from '../categories/categories.service.js';
import * as adminOrders from '../orders/admin-orders.service.js';
import * as images from '../products/product-images.service.js';
import * as products from '../products/products.service.js';
import { adminListCustomers } from '../users/users.service.js';
import { getDashboard } from './dashboard.service.js';

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

// Held in memory only long enough to check the real file type before it is written to storage.
const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_IMAGE_BYTES, files: 1, fields: 5 },
}).single('image');

export function adminRouter(storage: ImageStorage): Router {
  const router = Router();
  router.use(requireAdmin); // every route below is admin-only

  router.get('/dashboard', async (_req, res) => {
    res.json(await getDashboard());
  });

  // ---- Categories ----
  router.get('/categories', async (_req, res) => {
    res.json(await categories.adminListCategories());
  });
  router.post('/categories', async (req, res) => {
    res.status(201).json(await categories.createCategory(parse(createCategorySchema, req.body)));
  });
  router.patch('/categories/:id', async (req, res) => {
    const { id } = parse(idParamSchema, req.params);
    res.json(await categories.updateCategory(id, parse(updateCategorySchema, req.body)));
  });
  router.delete('/categories/:id', async (req, res) => {
    const { id } = parse(idParamSchema, req.params);
    await categories.deactivateCategory(id);
    res.status(204).end();
  });

  // ---- Products ----
  router.get('/products', async (req, res) => {
    res.json(await products.adminListProducts(parse(adminProductListQuerySchema, req.query)));
  });
  router.post('/products', async (req, res) => {
    res.status(201).json(await products.createProduct(parse(createProductSchema, req.body)));
  });
  router.get('/products/:id', async (req, res) => {
    const { id } = parse(idParamSchema, req.params);
    res.json(await products.adminGetProduct(id));
  });
  router.patch('/products/:id', async (req, res) => {
    const { id } = parse(idParamSchema, req.params);
    res.json(await products.updateProduct(id, parse(updateProductSchema, req.body)));
  });
  router.delete('/products/:id', async (req, res) => {
    const { id } = parse(idParamSchema, req.params);
    await products.deactivateProduct(id);
    res.status(204).end();
  });

  // ---- Product images ----
  router.post('/products/:id/images', imageUpload, async (req, res) => {
    const { id } = parse(idParamSchema, req.params);
    const { altText } = parse(productImageMetaSchema, req.body);
    if (!req.file) throw badRequest('INVALID_UPLOAD', 'Upload a single image in the "image" field');
    res.status(201).json(await images.addProductImage(id, req.file.buffer, altText, storage));
  });
  router.put('/products/:id/images/order', async (req, res) => {
    const { id } = parse(idParamSchema, req.params);
    res.json(await images.reorderProductImages(id, parse(reorderImagesSchema, req.body)));
  });
  router.delete('/images/:id', async (req, res) => {
    const { id } = parse(idParamSchema, req.params);
    await images.deleteProductImage(id, storage);
    res.status(204).end();
  });

  // ---- Orders ----
  router.get('/orders', async (req, res) => {
    res.json(await adminOrders.adminListOrders(parse(adminOrderListQuerySchema, req.query)));
  });
  router.get('/orders/:id', async (req, res) => {
    const { id } = parse(idParamSchema, req.params);
    res.json(await adminOrders.adminGetOrder(id));
  });
  router.patch('/orders/:id/status', async (req, res) => {
    const { id } = parse(idParamSchema, req.params);
    const { status } = parse(updateOrderStatusSchema, req.body);
    res.json(await adminOrders.updateOrderStatus(id, status));
  });

  // ---- Customers ----
  router.get('/customers', async (req, res) => {
    res.json(await adminListCustomers(parse(adminCustomerListQuerySchema, req.query)));
  });

  return router;
}
