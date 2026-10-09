import { pino } from 'pino';
import { config } from '../config/env.js';

// Structured JSON logs in staging/production; human-readable output in local dev.
export const logger = pino({
  level: config.LOG_LEVEL,
  base: { service: 'roopaank-api', version: config.APP_VERSION },
  redact: {
    paths: [
      'req.headers.cookie',
      'req.headers.authorization',
      'req.headers["x-razorpay-signature"]',
      'res.headers["set-cookie"]',
      '*.password',
      '*.passwordHash',
      '*.token',
    ],
    censor: '[REDACTED]',
  },
  ...(config.NODE_ENV === 'development' && { transport: { target: 'pino-pretty' } }),
});
