import { Router } from 'express';
import { addCartItemSchema, updateCartItemSchema } from '@roopaank/shared';
import { currentUser, requireUser } from '../../middleware/auth.js';
import { idParamSchema, parse } from '../../lib/validate.js';
import * as cart from './cart.service.js';

// Mutations return the updated cart so the UI can re-render without a second request.
export function cartRouter(): Router {
  const router = Router();
  router.use(requireUser);

  router.get('/', async (req, res) => {
    res.json(await cart.getCart(currentUser(req).id));
  });

  router.post('/items', async (req, res) => {
    res.json(await cart.addItem(currentUser(req).id, parse(addCartItemSchema, req.body)));
  });

  router.patch('/items/:id', async (req, res) => {
    const { id } = parse(idParamSchema, req.params);
    res.json(await cart.updateItem(currentUser(req).id, id, parse(updateCartItemSchema, req.body)));
  });

  router.delete('/items/:id', async (req, res) => {
    const { id } = parse(idParamSchema, req.params);
    res.json(await cart.removeItem(currentUser(req).id, id));
  });

  return router;
}
