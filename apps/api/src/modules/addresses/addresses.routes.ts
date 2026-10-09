import { Router } from 'express';
import { createAddressSchema, updateAddressSchema } from '@roopaank/shared';
import { currentUser, requireUser } from '../../middleware/auth.js';
import { idParamSchema, parse } from '../../lib/validate.js';
import * as addresses from './addresses.service.js';

export function addressesRouter(): Router {
  const router = Router();
  router.use(requireUser);

  router.get('/', async (req, res) => {
    res.json(await addresses.listAddresses(currentUser(req).id));
  });

  router.post('/', async (req, res) => {
    res.status(201).json(await addresses.createAddress(currentUser(req).id, parse(createAddressSchema, req.body)));
  });

  router.patch('/:id', async (req, res) => {
    const { id } = parse(idParamSchema, req.params);
    res.json(await addresses.updateAddress(currentUser(req).id, id, parse(updateAddressSchema, req.body)));
  });

  router.delete('/:id', async (req, res) => {
    const { id } = parse(idParamSchema, req.params);
    await addresses.deleteAddress(currentUser(req).id, id);
    res.status(204).end();
  });

  return router;
}
