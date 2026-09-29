import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startServer } from './helpers.js';

let server;
before(async () => { server = await startServer(); });
after(() => server.close());

test('GET /api/health responds 200', async () => {
  const res = await fetch(`${server.base}/health`);
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { message: 'API is healthy!' });
});
