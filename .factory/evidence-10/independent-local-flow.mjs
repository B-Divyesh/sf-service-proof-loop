import assert from 'node:assert/strict';

const base = 'http://127.0.0.1:4180';
let clientCounter = 10;

async function call(path, { method = 'GET', token, json, client } = {}) {
  const response = await fetch(`${base}${path}`, {
    method,
    headers: {
      'x-forwarded-for': client || `203.0.113.${clientCounter++}`,
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...(json === undefined ? {} : { 'content-type': 'application/json' }),
    },
    body: json === undefined ? undefined : JSON.stringify(json),
  });
  const text = await response.text();
  let data = text;
  try { data = JSON.parse(text); } catch {}
  return { status: response.status, headers: Object.fromEntries(response.headers), data };
}

const results = {};
const workspace = await call('/api/workspaces', {
  method: 'POST',
  json: { name: 'Independent QA workspace' },
});
assert.equal(workspace.status, 201);
const token = workspace.data.access_token;
const auth = { token, client: '203.0.113.101' };
const tomorrow = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);
const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
const baseVisit = {
  client_name: 'Avery Patel',
  location_label: '14 Cedar Lane',
  next_visit_at: tomorrow,
  technician: 'Morgan',
  checklist: [{ label: 'Air filter replaced', done: true }],
  notes: 'Filter size noted for the next recurring visit.',
  photos: [],
  photo_consent: false,
};

const invalidCases = {
  empty_workspace: await call('/api/workspaces', { method: 'POST', json: { name: '   ' } }),
  missing_auth: await call('/api/visits'),
  past_date: await call('/api/visits', { method: 'POST', ...auth, json: { ...baseVisit, next_visit_at: yesterday } }),
  invalid_date: await call('/api/visits', { method: 'POST', ...auth, json: { ...baseVisit, next_visit_at: 'tomorrow' } }),
  blank_checklist: await call('/api/visits', { method: 'POST', ...auth, json: { ...baseVisit, checklist: [{ label: '   ', done: true }] } }),
  no_consent: await call('/api/visits', { method: 'POST', ...auth, json: { ...baseVisit, photos: [{ url: 'data:image/png;base64,AA==', caption: 'Filter' }] } }),
  four_photos: await call('/api/visits', { method: 'POST', ...auth, json: { ...baseVisit, photo_consent: true, photos: Array.from({ length: 4 }, (_, i) => ({ url: 'data:image/png;base64,AA==', caption: `Photo ${i}` })) } }),
  long_note: await call('/api/visits', { method: 'POST', ...auth, json: { ...baseVisit, notes: 'n'.repeat(601) } }),
  price_below: await call('/api/extras', { method: 'POST', ...auth, json: { name: 'Below', detail: 'Invalid', price_cents: -1 } }),
  price_above: await call('/api/extras', { method: 'POST', ...auth, json: { name: 'Above', detail: 'Invalid', price_cents: 100001 } }),
};
for (const [name, result] of Object.entries(invalidCases)) {
  assert.equal(result.status, name === 'missing_auth' ? 401 : 400, name);
  assert.match(result.data.error, /\w/);
}
results.invalid_recovery = Object.fromEntries(Object.entries(invalidCases).map(([name, value]) => [name, { status: value.status, error: value.data.error }]));

const freeExtra = await call('/api/extras', { method: 'POST', ...auth, json: { name: 'No-cost check', detail: 'Boundary at zero', price_cents: 0 } });
const maxExtra = await call('/api/extras', { method: 'POST', ...auth, json: { name: 'Major service', detail: 'Boundary at one thousand dollars', price_cents: 100000 } });
assert.equal(freeExtra.status, 201);
assert.equal(maxExtra.status, 201);

const visit = await call('/api/visits', {
  method: 'POST',
  ...auth,
  json: {
    ...baseVisit,
    photo_consent: true,
    photos: [{ url: 'data:image/png;base64,iVBORw0KGgo=', caption: 'New air filter' }],
  },
});
assert.equal(visit.status, 201);
const proof = await call(`/api/proof/${encodeURIComponent(visit.data.proof_token)}`);
assert.equal(proof.status, 200);
assert.equal(proof.data.client_name, 'Avery Patel');
assert.equal(proof.data.photos[0].caption, 'New air filter');

const invalidReply = await call(`/api/proof/${encodeURIComponent(visit.data.proof_token)}/respond`, {
  method: 'POST',
  json: { status: 'unknown', rating: 0, comment: '', extra_ids: [] },
});
assert.equal(invalidReply.status, 400);
const reply = await call(`/api/proof/${encodeURIComponent(visit.data.proof_token)}/respond`, {
  method: 'POST',
  json: { status: 'problem', rating: 2, comment: 'Please bring the higher-flow filter next time.', extra_ids: [maxExtra.data.id] },
});
assert.equal(reply.status, 200);

const list = await call('/api/visits', auth);
assert.equal(list.status, 200);
const saved = list.data.find(item => item.id === visit.data.id);
assert.equal(saved.response_status, 'problem');
assert.equal(saved.rating, 2);
assert.equal(saved.requested_extras[0].price_cents, 100000);
const csv = await call(`/api/visits/${visit.data.id}/export.csv`, auth);
assert.equal(csv.status, 200);
assert.match(csv.data, /Avery Patel/);
assert.match(csv.data, /Major service/);
assert.match(csv.data, /1000\.00/);

const otherWorkspace = await call('/api/workspaces', { method: 'POST', json: { name: 'Other tenant' } });
const crossTenant = await call(`/api/visits/${visit.data.id}/export.csv`, { token: otherWorkspace.data.access_token });
assert.equal(crossTenant.status, 404);

const second = await call('/api/visits', { method: 'POST', ...auth, json: { ...baseVisit, client_name: 'Second' } });
const third = await call('/api/visits', { method: 'POST', ...auth, json: { ...baseVisit, client_name: 'Third' } });
const fourth = await call('/api/visits', { method: 'POST', ...auth, json: { ...baseVisit, client_name: 'Fourth' } });
assert.deepEqual([second.status, third.status, fourth.status], [201, 201, 402]);

results.normal_flow = {
  workspace: workspace.status,
  visit: visit.status,
  proof: proof.status,
  invalid_reply: invalidReply.status,
  recovered_reply: reply.status,
  saved_status: saved.response_status,
  saved_rating: saved.rating,
  csv_status: csv.status,
  csv_contains_boundary_price: csv.data.includes('1000.00'),
  cross_tenant_export: crossTenant.status,
  plan_statuses: [second.status, third.status, fourth.status],
  boundary_extra_statuses: [freeExtra.status, maxExtra.status],
};

console.log(JSON.stringify(results, null, 2));
