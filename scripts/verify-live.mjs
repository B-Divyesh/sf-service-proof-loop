import http from 'node:http';
import https from 'node:https';
import { verifyDeployment } from './verify-deployment.mjs';

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

const demo = await call('/api/demo', { method: 'POST', headers: { 'x-forwarded-for': '198.51.100.201' } });
check(demo.status === 200, 'demo creation failed', demo);
const demoReads = await Promise.all(Array.from({ length: 20 }, () => call('/api/visits', {
  headers: {
    authorization: `Bearer ${demo.data.access_token}`,
    'x-forwarded-for': '198.51.100.202',
  },
})));
evidence.fresh_connection_demo_reads = demoReads.map(result => result.status);
check(demoReads.every(result => result.status === 200), 'fresh connections did not share demo state', evidence.fresh_connection_demo_reads);

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
check(evidence.concurrent_plan_statuses.filter(status => status === 201).length === 3, 'concurrent free limit was not atomic', evidence.concurrent_plan_statuses);
check(evidence.concurrent_plan_statuses.filter(status => status === 402).length === 5, 'requests beyond the free limit were not rejected', evidence.concurrent_plan_statuses);

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

const rateClient = `198.51.100.${Math.floor(Math.random() * 30 + 220)}`;
const started = Date.now();
const burst = await Promise.all(Array.from({ length: 130 }, () => call('/api/not-found', {
  headers: { 'x-forwarded-for': rateClient },
})));
const rateStatuses = burst.map(result => result.status);
const allowed = rateStatuses.filter(status => status !== 429).length;
const limited = rateStatuses.filter(status => status === 429);
evidence.fresh_connection_rate_burst = { elapsed_ms: Date.now() - started, allowed, limited: limited.length };
check(rateStatuses.every(status => status === 404 || status === 429), 'rate probe returned an unexpected response', rateStatuses);
check(allowed <= 42 && limited.length >= 88, 'rate allowance exceeds one replica plus two refill tokens', evidence.fresh_connection_rate_burst);
check(burst.filter(result => result.status === 429).every(result => result.headers['retry-after']), '429 response omitted Retry-After', evidence.fresh_connection_rate_burst);

console.log(JSON.stringify(evidence, null, 2));
