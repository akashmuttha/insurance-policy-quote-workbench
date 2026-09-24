import { after, test } from 'node:test';
import assert from 'node:assert/strict';
import { createApiServer } from './app.mjs';
import { calculatePremium } from './quotes.mjs';

const server = createApiServer();
await new Promise((resolve, reject) => {
  server.once('error', reject);
  server.listen(0, '127.0.0.1', resolve);
});
const base = `http://127.0.0.1:${server.address().port}`;
after(() => new Promise(resolve => { server.close(resolve); server.closeAllConnections(); }));
const valid = { customerName: '  Asha Kulkarni  ', product: 'Motor', coverageAmount: 500000 };
const post = body => fetch(`${base}/api/quotes`, {
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
});

test('GET policies returns six seed records', async () => {
  const response = await fetch(`${base}/api/policies`);
  assert.equal(response.status, 200);
  assert.equal((await response.json()).length, 6);
});
test('POST validates and calculates on the server, ignoring a supplied premium', async () => {
  const response = await post({ ...valid, annualPremium: 1 });
  assert.equal(response.status, 201);
  const quote = await response.json();
  assert.equal(quote.customerName, 'Asha Kulkarni');
  assert.equal(quote.annualPremium, 10000);
  assert.equal(quote.currency, 'INR');
  assert.equal(quote.ratePercent, 2);
  assert.match(quote.quoteId, /^Q-/);
});
test('all products use their specified fictional rates', async () => {
  for (const [product, premium] of [['Health', 15000], ['Motor', 10000], ['Home', 5000]]) {
    const response = await post({ ...valid, product });
    assert.equal((await response.json()).annualPremium, premium);
  }
  assert.equal(calculatePremium(100050, 100), 1001);
});
test('invalid shapes, inherited object keys, and numeric strings are rejected', async () => {
  for (const body of [null, [], {}, { ...valid, customerName: ' ' }, { ...valid, product: 'toString' }, { ...valid, coverageAmount: '500000' }, { ...valid, coverageAmount: -1 }]) {
    const response = await post(body);
    assert.equal(response.status, 422);
    assert.ok(Object.keys((await response.json()).fieldErrors).length);
  }
});
test('malformed JSON, unsupported content type and oversized bodies have explicit errors', async () => {
  const malformed = await fetch(`${base}/api/quotes`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{' });
  assert.equal(malformed.status, 400);
  const wrongType = await fetch(`${base}/api/quotes`, { method: 'POST', body: 'text' });
  assert.equal(wrongType.status, 415);
  assert.equal((await post({ ...valid, customerName: 'a'.repeat(9000) })).status, 413);
});
test('unknown routes and wrong methods return JSON errors', async () => {
  assert.equal((await fetch(`${base}/api/missing`)).status, 404);
  const response = await fetch(`${base}/api/quotes`);
  assert.equal(response.status, 405);
  assert.equal(response.headers.get('allow'), 'POST');
});
