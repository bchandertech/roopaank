import request from 'supertest';
import { buildTestApp } from '../tests/helpers/app.js';

const { app } = buildTestApp();

describe('cross-cutting HTTP behaviour', () => {
  it('reports health with the database reachable', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ status: 'ok' });
  });

  it('returns the standard error shape for unknown routes', async () => {
    const res = await request(app).get('/api/does-not-exist');
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: { code: 'ROUTE_NOT_FOUND', message: 'Route not found' } });
  });

  it('rejects malformed JSON without leaking parser details', async () => {
    const res = await request(app).post('/api/auth/login').set('Content-Type', 'application/json').send('{"email":');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_JSON');
    expect(JSON.stringify(res.body)).not.toMatch(/SyntaxError|at /);
  });

  it('rejects oversized JSON bodies', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'a@example.com', password: 'x'.repeat(200_000) });
    expect(res.status).toBe(413);
  });

  it('blocks writes from another origin (CSRF) but allows the web app origin', async () => {
    const blocked = await request(app).post('/api/auth/logout').set('Origin', 'https://evil.example');
    expect(blocked.status).toBe(403);
    expect(blocked.body.error.code).toBe('ORIGIN_NOT_ALLOWED');

    const allowed = await request(app).post('/api/auth/logout').set('Origin', 'http://localhost:5173');
    expect(allowed.status).toBe(204);
  });

  it('allows CORS only for the web app origin, with credentials', async () => {
    const ok = await request(app).get('/api/categories').set('Origin', 'http://localhost:5173');
    expect(ok.headers['access-control-allow-origin']).toBe('http://localhost:5173');
    expect(ok.headers['access-control-allow-credentials']).toBe('true');

    // The header always names our web origin, so the browser refuses to share responses with others.
    const other = await request(app).get('/api/categories').set('Origin', 'https://evil.example');
    expect(other.headers['access-control-allow-origin']).not.toBe('https://evil.example');
  });

  it('sends security headers and a request id', async () => {
    const res = await request(app).get('/api/categories').set('X-Request-Id', 'trace-123');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-powered-by']).toBeUndefined();
    expect(res.headers['x-request-id']).toBe('trace-123');
  });
});
