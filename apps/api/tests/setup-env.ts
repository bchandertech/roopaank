// Runs before each test file, before any app module is imported.
import os from 'node:os';
import path from 'node:path';
import { assertIsTestDatabase, TEST_DATABASE_URL } from './test-database.js';

assertIsTestDatabase(TEST_DATABASE_URL);

Object.assign(process.env, {
  NODE_ENV: 'test',
  LOG_LEVEL: 'silent',
  DATABASE_URL: TEST_DATABASE_URL,
  WEB_ORIGIN: 'http://localhost:5173',
  // Fake credentials: tests never call Razorpay (see tests/helpers/fake-gateway.ts).
  RAZORPAY_KEY_ID: 'rzp_test_fake',
  RAZORPAY_KEY_SECRET: 'test_key_secret',
  RAZORPAY_WEBHOOK_SECRET: 'test_webhook_secret',
  UPLOAD_DIR: path.join(os.tmpdir(), 'roopaank-test-uploads'),
  PUBLIC_UPLOADS_URL: 'http://localhost:4000/uploads',
});
