import assert from 'node:assert/strict';
import test from 'node:test';
import {
  DEMO_SEQUENCE_COUNT,
  READS_PER_DEMO,
  SAMPLE_LOCATION,
  assertDemoStateContinuity,
} from '../scripts/state-continuity.mjs';

function healthySequence() {
  const visitId = 'seeded-visit';
  return {
    create: 200,
    reads: Array.from({ length: READS_PER_DEMO }, () => ({
      status: 200,
      location: SAMPLE_LOCATION,
      visitId,
    })),
    proof: { status: 200, location: SAMPLE_LOCATION, visitId },
  };
}

test('accepts 30 demos whose repeated fresh reads retain the seeded workspace', () => {
  assert.doesNotThrow(() => {
    assertDemoStateContinuity(Array.from({ length: DEMO_SEQUENCE_COUNT }, healthySequence));
  });
});

test('rejects the verifier’s intermittent 401 read pattern', () => {
  const sequences = Array.from({ length: DEMO_SEQUENCE_COUNT }, healthySequence);
  sequences[6].reads[3] = { status: 401, location: undefined, visitId: undefined };
  assert.throws(
    () => assertDemoStateContinuity(sequences),
    /demo sequence 7, read 4 lost its seeded workspace \(401, no visit\)/,
  );
});
