import { Router } from 'express';
import { z } from 'zod';
import { productListQuerySchema, slugSchema } from '@roopaank/shared';
import { parse } from '../../lib/validate.js';
import * as products from './products.service.js';

export function productsRouter(): Router {
  const router = Router();

  router.get('/', async (req, res) => {
    res.json(await products.listProducts(parse(productListQuerySchema, req.query)));
  });

  router.get('/:slug', async (req, res) => {
    const { slug } = parse(z.object({ slug: slugSchema }), req.params);
    res.json(await products.getProductBySlug(slug));
  });

  return router;
}
