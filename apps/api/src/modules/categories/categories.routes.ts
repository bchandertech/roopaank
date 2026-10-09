import { Router } from 'express';
import * as categories from './categories.service.js';

export function categoriesRouter(): Router {
  const router = Router();

  router.get('/', async (_req, res) => {
    res.json(await categories.listCategories());
  });

  return router;
}
