import assert from 'node:assert/strict';
import test from 'node:test';
import { assertRateBurst } from '../scripts/rate-limit.mjs';

const responses = (allowed, limited) => [
  ...Array.from({ length: allowed }, () => ({ status: 404 })),
  ...Array.from({ length: limited }, () => ({ status: 429, retryAfter: '1' })),
];

test('accepts one 40-request allowance for the 45-request claim probe', () => {
  assert.deepEqual(
    assertRateBurst(responses(40, 5), { requests: 45, minimumLimited: 3 }),
    { requests: 45, allowed: 40, limited: 5 },
  );
});

test('rejects verifier 8\'s 45-of-45 unbounded request result', () => {
  assert.throws(
    () => assertRateBurst(responses(45, 0), { requests: 45, minimumLimited: 3 }),
    /rate allowance exceeds one replica plus two refill tokens/,
  );
});

test('rejects verifier 8\'s tripled 120-request allowance', () => {
  assert.throws(
    () => assertRateBurst(responses(120, 10), { requests: 130, minimumLimited: 88 }),
    /rate allowance exceeds one replica plus two refill tokens/,
  );
});

test('requires Retry-After: 1 on every limited response', () => {
  const burst = responses(40, 5);
  burst[44].retryAfter = undefined;
  assert.throws(
    () => assertRateBurst(burst, { requests: 45, minimumLimited: 3 }),
    /429 response omitted Retry-After: 1/,
  );
});
