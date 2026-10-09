import { createApp } from '../../src/app.js';
import { config } from '../../src/config/env.js';
import { createLocalImageStorage } from '../../src/lib/storage.js';
import type { RateLimitRules } from '../../src/middleware/rate-limit.js';
import { FakeGateway } from './fake-gateway.js';

const relaxed = { windowMs: 60_000, limit: 10_000 };
const relaxedLimits: RateLimitRules = { login: relaxed, register: relaxed, checkout: relaxed };

/** The real app with a fake payment provider. Rate limits are relaxed unless a test sets them. */
export function buildTestApp(options: { rateLimits?: RateLimitRules } = {}) {
  const gateway = new FakeGateway();
  const app = createApp({
    gateway,
    storage: createLocalImageStorage(config.UPLOAD_DIR, config.PUBLIC_UPLOADS_URL),
    rateLimits: options.rateLimits ?? relaxedLimits,
  });
  return { app, gateway };
}
