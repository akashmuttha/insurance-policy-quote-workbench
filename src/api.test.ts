import { afterEach, expect, test, vi } from 'vitest';
import { fetchPolicies } from './PolicyList';
import { requestQuote } from './quoteApi';

afterEach(() => vi.unstubAllGlobals());
const signal = () => new AbortController().signal;
const submission = { customerName: 'Asha', product: 'Motor' as const, coverageAmount: 500000 };

test('policy loader rejects HTTP errors and malformed records, but accepts an empty list', async () => {
  const fetchMock = vi.fn()
    .mockResolvedValueOnce(new Response('{}', { status: 500 }))
    .mockResolvedValueOnce(new Response(JSON.stringify([{ id: '1', customerName: 'Asha', premium: '100', status: 'Active' }])))
    .mockResolvedValueOnce(new Response('[]'));
  vi.stubGlobal('fetch', fetchMock);
  await expect(fetchPolicies(signal())).rejects.toThrow('Request failed (500)');
  await expect(fetchPolicies(signal())).rejects.toThrow('Unexpected policy response');
  await expect(fetchPolicies(signal())).resolves.toEqual([]);
});

test('quote loader sends JSON and rejects an invalid successful response', async () => {
  const fetchMock = vi.fn().mockResolvedValue(new Response('{"annualPremium":"10000"}'));
  vi.stubGlobal('fetch', fetchMock);
  const abortSignal = signal();
  await expect(requestQuote(submission, abortSignal)).rejects.toThrow('Unexpected quote response');
  expect(fetchMock).toHaveBeenCalledWith('/api/quotes', {
    method: 'POST', signal: abortSignal, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(submission),
  });
});

test('quote loader keeps validated field errors and handles non-JSON server failures', async () => {
  vi.stubGlobal('fetch', vi.fn()
    .mockResolvedValueOnce(new Response(JSON.stringify({ fieldErrors: { product: 'Choose a product.', customerName: 42 } }), { status: 422 }))
    .mockResolvedValueOnce(new Response('Unavailable', { status: 503 })));
  await expect(requestQuote(submission, signal())).rejects.toMatchObject({ fieldErrors: { product: 'Choose a product.' } });
  await expect(requestQuote(submission, signal())).rejects.toThrow('(503)');
});
