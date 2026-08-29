export const DEMO_SEQUENCE_COUNT = 20;
export const READS_PER_DEMO = 20;
export const SAMPLE_LOCATION = 'Willow Street';

export async function probeDemoStateContinuity(call) {
  const demos = await Promise.all(
    Array.from({ length: DEMO_SEQUENCE_COUNT }, (_, index) => call('/api/demo', {
      method: 'POST',
      headers: { 'x-forwarded-for': `198.19.0.${index + 1}` },
    })),
  );

  return Promise.all(demos.map(async (demo, demoIndex) => {
    if (demo.status !== 200) {
      return { create: demo.status, reads: [], proof: { status: 0 } };
    }

    // Launch every authenticated read together. A sequential probe can keep
    // hitting one replica and miss the split-state failure seen by verifier 7.
    const responses = await Promise.all(
      Array.from({ length: READS_PER_DEMO }, (_, readIndex) => call('/api/visits', {
        headers: {
          authorization: `Bearer ${demo.data.access_token}`,
          'x-forwarded-for': `198.18.${demoIndex}.${readIndex + 1}`,
        },
      })),
    );
    const reads = responses.map(response => ({
      status: response.status,
      location: response.data?.[0]?.location_label,
      visitId: response.data?.[0]?.id,
    }));
    const proofToken = responses[0]?.data?.[0]?.proof_token;
    const proof = proofToken
      ? await call(`/api/proof/${encodeURIComponent(proofToken)}`, {
          headers: { 'x-forwarded-for': `198.20.0.${demoIndex + 1}` },
        })
      : { status: 0 };

    return {
      create: demo.status,
      reads,
      proof: {
        status: proof.status,
        location: proof.data?.location_label,
        visitId: proof.data?.id,
      },
    };
  }));
}

export function assertDemoStateContinuity(sequences) {
  if (sequences.length !== DEMO_SEQUENCE_COUNT) {
    throw new Error(`expected ${DEMO_SEQUENCE_COUNT} fresh demo sequences, received ${sequences.length}`);
  }

  for (const [index, sequence] of sequences.entries()) {
    if (sequence.create !== 200) {
      throw new Error(`demo sequence ${index + 1} did not create a workspace (${sequence.create})`);
    }
    if (sequence.reads.length !== READS_PER_DEMO) {
      throw new Error(`demo sequence ${index + 1} made ${sequence.reads.length} reads instead of ${READS_PER_DEMO}`);
    }
    for (const [readIndex, read] of sequence.reads.entries()) {
      if (read.status !== 200 || read.location !== SAMPLE_LOCATION || !read.visitId) {
        throw new Error(
          `demo sequence ${index + 1}, read ${readIndex + 1} lost its seeded workspace `
          + `(${read.status}, ${read.location ?? 'no visit'})`,
        );
      }
    }
    if (
      sequence.proof?.status !== 200
      || sequence.proof?.location !== SAMPLE_LOCATION
      || sequence.proof?.visitId !== sequence.reads[0].visitId
    ) {
      throw new Error(
        `demo sequence ${index + 1} could not read its proof `
        + `(${sequence.proof?.status ?? 'not requested'}, ${sequence.proof?.location ?? 'no location'})`,
      );
    }
  }
}
