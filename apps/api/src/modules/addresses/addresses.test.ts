import request from 'supertest';
import { buildTestApp } from '../../../tests/helpers/app.js';
import { resetDatabase } from '../../../tests/helpers/db.js';
import { createAddress, createCustomer } from '../../../tests/helpers/factories.js';
import { prisma } from '../../lib/prisma.js';

const { app } = buildTestApp();

beforeEach(resetDatabase);

const validAddress = {
  fullName: 'Priya Sharma',
  phone: '+91 98765 43210',
  addressLine1: '12 MG Road',
  city: 'Bengaluru',
  state: 'Karnataka',
  postalCode: '560001',
};

describe('addresses', () => {
  it('requires login', async () => {
    expect((await request(app).get('/api/addresses')).status).toBe(401);
  });

  it('creates an address in India, normalising the phone; the first one is the default', async () => {
    const { cookie } = await createCustomer();
    const res = await request(app)
      .post('/api/addresses')
      .set('Cookie', cookie)
      .send({ ...validAddress, country: 'US' });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ phone: '9876543210', country: 'IN', isDefault: true, addressLine2: null });
  });

  it('keeps exactly one default address', async () => {
    const { user, cookie } = await createCustomer();
    const first = await createAddress(user.id, { isDefault: true });

    const second = await request(app)
      .post('/api/addresses')
      .set('Cookie', cookie)
      .send({ ...validAddress, isDefault: true });
    expect(second.body.isDefault).toBe(true);
    expect((await prisma.address.findUniqueOrThrow({ where: { id: first.id } })).isDefault).toBe(false);

    const list = await request(app).get('/api/addresses').set('Cookie', cookie);
    expect(list.body.map((a: { isDefault: boolean }) => a.isDefault)).toEqual([true, false]);
  });

  it('promotes another address when the default is deleted', async () => {
    const { user, cookie } = await createCustomer();
    const defaultAddress = await createAddress(user.id, { isDefault: true });
    const other = await createAddress(user.id, { isDefault: false });

    expect((await request(app).delete(`/api/addresses/${defaultAddress.id}`).set('Cookie', cookie)).status).toBe(204);
    expect((await prisma.address.findUniqueOrThrow({ where: { id: other.id } })).isDefault).toBe(true);
  });

  it('updates fields and can clear the second line', async () => {
    const { user, cookie } = await createCustomer();
    const address = await prisma.address.create({
      data: { ...validAddress, phone: '9876543210', userId: user.id, addressLine2: 'Near park', isDefault: true },
    });

    const res = await request(app)
      .patch(`/api/addresses/${address.id}`)
      .set('Cookie', cookie)
      .send({ city: 'Mysuru', addressLine2: '' });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ city: 'Mysuru', addressLine2: null });
  });

  it('validates PIN code, state and phone', async () => {
    const { cookie } = await createCustomer();
    const res = await request(app)
      .post('/api/addresses')
      .set('Cookie', cookie)
      .send({ ...validAddress, postalCode: '012345', state: 'Texas', phone: '12345' });
    expect(res.status).toBe(400);
    expect(Object.keys(res.body.error.details.fieldErrors).sort()).toEqual(['phone', 'postalCode', 'state']);
  });

  it("hides another user's addresses (404)", async () => {
    const owner = await createCustomer();
    const other = await createCustomer();
    const address = await createAddress(owner.user.id);

    expect(
      (await request(app).patch(`/api/addresses/${address.id}`).set('Cookie', other.cookie).send({ city: 'Pune' }))
        .status,
    ).toBe(404);
    expect((await request(app).delete(`/api/addresses/${address.id}`).set('Cookie', other.cookie)).status).toBe(404);
    expect((await request(app).get('/api/addresses').set('Cookie', other.cookie)).body).toEqual([]);
  });
});
