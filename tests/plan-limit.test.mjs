import assert from 'node:assert/strict';
import test from 'node:test';
import { assertConcurrentFreePlan } from '../scripts/plan-limit.mjs';

test('accepts exactly three created and five payment-required writes', () => {
  assert.deepEqual(
    assertConcurrentFreePlan([201, 402, 201, 402, 402, 201, 402, 402]),
    { created: 3, limited: 5, unauthorized: 0 },
  );
});

test('rejects verifier 9\'s exact three-created and five-unauthorized split-state result', () => {
  assert.throws(
    () => assertConcurrentFreePlan([201, 401, 401, 201, 401, 401, 201, 401]),
    /lost workspace authorization across writers/,
  );
});

test('rejects verifier 10\'s exact concurrent write statuses', () => {
  assert.throws(
    () => assertConcurrentFreePlan([201, 401, 201, 401, 401, 401, 401, 201]),
    /lost workspace authorization across writers/,
  );
});
