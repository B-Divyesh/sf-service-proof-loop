import assert from 'node:assert/strict';
import test from 'node:test';
import {
  DEMO_SEQUENCE_COUNT,
  READS_PER_DEMO,
  SAMPLE_LOCATION,
  assertDemoStateContinuity,
  probeDemoStateContinuity,
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

test('accepts the exact 20-demo, 400-read verifier scenario when state is coherent', () => {
  assert.doesNotThrow(() => {
    assertDemoStateContinuity(Array.from({ length: DEMO_SEQUENCE_COUNT }, healthySequence));
  });
});

test('rejects verifier 9\'s exact 138-of-400 reads and 1-of-20 proofs', () => {
  const sequences = Array.from({ length: DEMO_SEQUENCE_COUNT }, healthySequence);
  let failures = 0;
  for (const sequence of sequences) {
    for (const [readIndex] of sequence.reads.entries()) {
      if (failures < 262) {
        sequence.reads[readIndex] = { status: 401, location: undefined, visitId: undefined };
        failures += 1;
      }
    }
  }
  for (const [index, sequence] of sequences.entries()) {
    sequence.proof = index === 19
      ? sequence.proof
      : { status: index < 14 ? 0 : 404, location: undefined, visitId: undefined };
  }
  assert.equal(failures, 262);
  assert.equal(sequences.flatMap(sequence => sequence.reads).filter(read => read.status === 200).length, 138);
  assert.equal(sequences.filter(sequence => sequence.proof.status === 200).length, 1);
  assert.throws(
    () => assertDemoStateContinuity(sequences),
    /lost its seeded workspace \(401, no visit\)/,
  );
});

test('rejects verifier 10\'s exact 196-of-400 reads and 6-of-20 proofs', () => {
  const sequences = Array.from({ length: DEMO_SEQUENCE_COUNT }, healthySequence);
  let failures = 0;
  for (const sequence of sequences) {
    for (const [readIndex] of sequence.reads.entries()) {
      if (failures < 204) {
        sequence.reads[readIndex] = { status: 401, location: undefined, visitId: undefined };
        failures += 1;
      }
    }
  }
  for (const [index, sequence] of sequences.entries()) {
    if (index < 14) {
      sequence.proof = { status: 0, location: undefined, visitId: undefined };
    }
  }
  assert.equal(failures, 204);
  assert.equal(sequences.flatMap(sequence => sequence.reads).filter(read => read.status === 200).length, 196);
  assert.equal(sequences.filter(sequence => sequence.proof.status === 200).length, 6);
  assert.throws(
    () => assertDemoStateContinuity(sequences),
    /lost its seeded workspace \(401, no visit\)/,
  );
});

test('live continuity probe launches all 400 authenticated reads concurrently', async () => {
  let demoIndex = 0;
  let readCalls = 0;
  let activeReads = 0;
  let maxActiveReads = 0;
  const pendingReads = [];
  const call = async (path, options = {}) => {
    if (path === '/api/demo') {
      const token = `workspace-${demoIndex}`;
      demoIndex += 1;
      return { status: 200, data: { access_token: token } };
    }
    if (path === '/api/visits') {
      const token = options.headers.authorization.replace('Bearer ', '');
      readCalls += 1;
      activeReads += 1;
      maxActiveReads = Math.max(maxActiveReads, activeReads);
      return new Promise(resolve => {
        pendingReads.push(() => {
          activeReads -= 1;
          resolve({
            status: 200,
            data: [{
              id: `visit-${token}`,
              location_label: SAMPLE_LOCATION,
              proof_token: `proof-${token}`,
            }],
          });
        });
        if (pendingReads.length === DEMO_SEQUENCE_COUNT * READS_PER_DEMO) {
          queueMicrotask(() => pendingReads.splice(0).forEach(release => release()));
        }
      });
    }
    const token = decodeURIComponent(path.slice('/api/proof/'.length)).replace('proof-', '');
    return {
      status: 200,
      data: { id: `visit-${token}`, location_label: SAMPLE_LOCATION },
    };
  };

  const sequences = await probeDemoStateContinuity(call);
  assertDemoStateContinuity(sequences);
  assert.equal(readCalls, 400);
  assert.equal(maxActiveReads, 400);
});
