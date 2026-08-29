export const DEMO_SEQUENCE_COUNT = 30;
export const READS_PER_DEMO = 10;
export const SAMPLE_LOCATION = 'Willow Street';

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
