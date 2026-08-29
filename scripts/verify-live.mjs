import http from 'node:http';
import https from 'node:https';
import { verifyDeployment } from './verify-deployment.mjs';
import {
  DEMO_SEQUENCE_COUNT,
  READS_PER_DEMO,
  assertDemoStateContinuity,
  probeDemoStateContinuity,
} from './state-continuity.mjs';
import { assertRateBurst } from './rate-limit.mjs';
import { assertConcurrentFreePlan } from './plan-limit.mjs';

const base = new URL(process.env.LIVE_BASE_URL || 'https://service-proof-loop.sociobot.in');
const transport = base.protocol === 'https:' ? https : http;

function call(path, { method = 'GET', headers = {}, json } = {}) {
  const body = json === undefined ? undefined : JSON.stringify(json);
  return new Promise((resolve, reject) => {
    const request = transport.request(new URL(path, base), {
      method,
      agent: false,
      headers: {
        connection: 'close',
        ...(body ? { 'content-type': 'application/json', 'content-length': Buffer.byteLength(body) } : {}),
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
    if (body) request.write(body);
    request.end();
  });
}

function check(condition, message, evidence) {
  if (!condition) throw new Error(`${message}: ${JSON.stringify(evidence)}`);
}

function visit(nextVisitAt, label = 'Kitchen') {
  return {
    client_name: 'Maya',
    location_label: 'Willow Street',
    next_visit_at: nextVisitAt,
    technician: 'Elena',
    checklist: [{ label, done: true }],
    notes: '',
    photos: [],
    photo_consent: false,
  };
}

const evidence = {};
if (base.hostname === 'service-proof-loop.sociobot.in' || process.env.VERIFY_AZURE_TOPOLOGY === '1') {
  evidence.deployment_topology = verifyDeployment();
}
const health = await call('/health');
check(health.status === 200, 'health must return 200', health);
if (process.env.EXPECTED_SHA) {
  check(health.data.build_sha === process.env.EXPECTED_SHA, 'live build identity mismatch', health.data);
}
evidence.health = health.data;

const demoSequences = await probeDemoStateContinuity(call);
evidence.concurrent_demo_workspace_proof = {
  demos: DEMO_SEQUENCE_COUNT,
  simultaneous_reads_per_demo: READS_PER_DEMO,
  total_reads: DEMO_SEQUENCE_COUNT * READS_PER_DEMO,
  successful_reads: demoSequences.flatMap(sequence => sequence.reads)
    .filter(read => read.status === 200).length,
  successful_proofs: demoSequences.filter(sequence => sequence.proof.status === 200).length,
};
try {
  assertDemoStateContinuity(demoSequences);
} catch (error) {
  check(false, 'fresh demo, repeated workspace reads, and proof requests did not share state', {
    message: error.message,
    sequences: demoSequences,
  });
}

const workspace = await call('/api/workspaces', {
  method: 'POST',
  headers: { 'x-forwarded-for': '198.51.100.203' },
  json: { name: `Concurrency probe ${Date.now()}` },
});
check(workspace.status === 201, 'workspace creation failed', workspace);
const tomorrow = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);
const concurrent = await Promise.all(Array.from({ length: 8 }, () => call('/api/visits', {
  method: 'POST',
  headers: {
    authorization: `Bearer ${workspace.data.access_token}`,
    'x-forwarded-for': '198.51.100.204',
  },
  json: visit(tomorrow),
})));
evidence.concurrent_plan_statuses = concurrent.map(result => result.status);
assertConcurrentFreePlan(evidence.concurrent_plan_statuses);

const validationWorkspace = await call('/api/workspaces', {
  method: 'POST',
  headers: { 'x-forwarded-for': '198.51.100.205' },
  json: { name: `Validation probe ${Date.now()}` },
});
check(validationWorkspace.status === 201, 'validation workspace creation failed', validationWorkspace);
const auth = { authorization: `Bearer ${validationWorkspace.data.access_token}`, 'x-forwarded-for': '198.51.100.206' };
const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
const past = await call('/api/visits', { method: 'POST', headers: auth, json: visit(yesterday) });
const blank = await call('/api/visits', { method: 'POST', headers: auth, json: visit(tomorrow, '   \t') });
evidence.validation_statuses = { past_date: past.status, blank_checklist_label: blank.status };
check(past.status === 400 && blank.status === 400, 'semantic visit validation failed', evidence.validation_statuses);

async function verifyRateBurst(size, client, minimumLimited) {
  const started = Date.now();
  const responses = await Promise.all(Array.from({ length: size }, () => call('/api/not-found', {
    headers: { 'x-forwarded-for': client },
  })));
  const result = assertRateBurst(
    responses.map(response => ({
      status: response.status,
      retryAfter: response.headers['retry-after'],
    })),
    { requests: size, minimumLimited },
  );
  return { ...result, elapsed_ms: Date.now() - started };
}

evidence.rate_bursts = {
  claim_45: await verifyRateBurst(45, '198.21.0.1', 3),
  verifier_130: await verifyRateBurst(130, '198.21.0.2', 88),
};

console.log(JSON.stringify(evidence, null, 2));
