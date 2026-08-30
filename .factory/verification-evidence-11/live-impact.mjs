import { writeFile } from 'node:fs/promises';
import https from 'node:https';
import {
  DEMO_SEQUENCE_COUNT,
  READS_PER_DEMO,
  probeDemoStateContinuity,
} from '../../scripts/state-continuity.mjs';

const base = 'https://service-proof-loop.sociobot.in';

async function call(path, { method = 'GET', headers = {}, json } = {}) {
  const body = json === undefined ? undefined : JSON.stringify(json);
  return new Promise((resolve, reject) => {
    const request = https.request(new URL(path, base), {
      method,
      agent: false,
      headers: {
        connection: 'close',
        ...(body === undefined ? {} : {
          'content-type': 'application/json',
          'content-length': Buffer.byteLength(body),
        }),
        ...headers,
      },
    }, response => {
      const chunks = [];
      response.on('data', chunk => chunks.push(chunk));
      response.on('end', () => {
        const text = Buffer.concat(chunks).toString('utf8');
        let data = text;
        try { data = JSON.parse(text); } catch {}
        resolve({ status: response.statusCode, headers: response.headers, data });
      });
    });
    request.on('error', reject);
    request.setTimeout(15_000, () => request.destroy(new Error(`Timed out: ${path}`)));
    if (body !== undefined) request.write(body);
    request.end();
  });
}

function counts(values) {
  return values.reduce((result, value) => {
    result[value] = (result[value] || 0) + 1;
    return result;
  }, {});
}

function visit(nextVisitAt) {
  return {
    client_name: 'Maya',
    location_label: 'Willow Street',
    next_visit_at: nextVisitAt,
    technician: 'Elena',
    checklist: [{ label: 'Kitchen', done: true }],
    notes: '',
    photos: [],
    photo_consent: false,
  };
}

const evidence = {};
const health = await call('/health');
evidence.health = { status: health.status, data: health.data, headers: health.headers };

const sequences = await probeDemoStateContinuity(call);
const reads = sequences.flatMap(sequence => sequence.reads);
evidence.continuity = {
  demos_attempted: DEMO_SEQUENCE_COUNT,
  demo_create_statuses: counts(sequences.map(sequence => sequence.create)),
  reads_attempted: DEMO_SEQUENCE_COUNT * READS_PER_DEMO,
  read_statuses: counts(reads.map(read => read.status)),
  successful_seeded_reads: reads.filter(read => read.status === 200 && read.location === 'Willow Street').length,
  proof_statuses: counts(sequences.map(sequence => sequence.proof.status)),
  matching_proofs: sequences.filter(sequence =>
    sequence.proof.status === 200
    && sequence.proof.location === 'Willow Street'
    && sequence.proof.visitId === sequence.reads[0]?.visitId
  ).length,
};

const workspace = await call('/api/workspaces', {
  method: 'POST',
  headers: { 'x-forwarded-for': '198.51.101.203' },
  json: { name: `Verifier 11 ${Date.now()}` },
});
const tomorrow = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);
const writes = workspace.status === 201
  ? await Promise.all(Array.from({ length: 8 }, () => call('/api/visits', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${workspace.data.access_token}`,
        'x-forwarded-for': '198.51.101.204',
      },
      json: visit(tomorrow),
    })))
  : [];
evidence.concurrent_plan = {
  workspace_status: workspace.status,
  write_statuses: counts(writes.map(result => result.status)),
  sequence: writes.map(result => result.status),
};

async function rateBurst(requests, client) {
  const started = performance.now();
  const responses = await Promise.all(Array.from({ length: requests }, () => call('/api/not-found', {
    headers: { 'x-forwarded-for': client },
  })));
  return {
    requests,
    statuses: counts(responses.map(response => response.status)),
    limited_with_retry_after_1: responses.filter(response =>
      response.status === 429 && response.headers['retry-after'] === '1'
    ).length,
    elapsed_ms: Math.round(performance.now() - started),
  };
}

evidence.rate_45 = await rateBurst(45, '198.21.11.1');
evidence.rate_130 = await rateBurst(130, '198.21.11.2');

const output = JSON.stringify(evidence, null, 2);
await writeFile(new URL('./live-impact.json', import.meta.url), output);
console.log(output);
