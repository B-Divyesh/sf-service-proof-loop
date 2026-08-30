import { writeFile } from 'node:fs/promises';

const base = 'http://127.0.0.1:4199';

async function call(path, { method = 'GET', token, headers = {}, json } = {}) {
  const response = await fetch(new URL(path, base), {
    method,
    headers: {
      ...(json === undefined ? {} : { 'content-type': 'application/json' }),
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: json === undefined ? undefined : JSON.stringify(json),
  });
  const text = await response.text();
  let data = text;
  try { data = JSON.parse(text); } catch {}
  return { status: response.status, headers: Object.fromEntries(response.headers), data };
}

function count(values) {
  return values.reduce((result, value) => {
    result[value] = (result[value] || 0) + 1;
    return result;
  }, {});
}

const tomorrow = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);
const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
const photo = { url: 'data:image/png;base64,iVBORw0KGgo=', caption: 'Completed surface' };
const visit = {
  client_name: 'Maya Boundary',
  location_label: 'Willow Boundary',
  next_visit_at: tomorrow,
  technician: 'Elena',
  checklist: [{ label: 'Kitchen', done: true }],
  notes: 'Ready for review.',
  photos: [],
  photo_consent: false,
};

const evidence = {};
evidence.health = await call('/health');
evidence.blank_workspace = await call('/api/workspaces', { method: 'POST', json: { name: '   ' } });
evidence.missing_auth = await call('/api/visits');

const workspace = await call('/api/workspaces', { method: 'POST', json: { name: 'Boundary Works' } });
const token = workspace.data.access_token;
evidence.workspace = { status: workspace.status, demo: workspace.data.demo };

const extras = {};
for (const cents of [-1, 0, 100_000, 100_001]) {
  const result = await call('/api/extras', {
    method: 'POST', token,
    json: { name: `Extra ${cents}`, detail: 'Boundary extra', price_cents: cents },
  });
  extras[cents] = { status: result.status, error: result.data.error, id: result.data.id };
}
evidence.extra_boundaries = Object.fromEntries(Object.entries(extras).map(([key, value]) => [key, { status: value.status, error: value.error }]));

const invalidVisits = {
  past_date: { ...visit, next_visit_at: yesterday },
  malformed_date: { ...visit, next_visit_at: 'soon' },
  empty_checklist: { ...visit, checklist: [] },
  blank_checklist: { ...visit, checklist: [{ label: '   ', done: true }] },
  photos_without_consent: { ...visit, photos: [photo] },
  four_photos: { ...visit, photo_consent: true, photos: [photo, photo, photo, photo] },
  notes_601: { ...visit, notes: 'n'.repeat(601) },
};
evidence.invalid_visits = {};
for (const [name, payload] of Object.entries(invalidVisits)) {
  const result = await call('/api/visits', { method: 'POST', token, json: payload });
  evidence.invalid_visits[name] = { status: result.status, error: result.data.error };
}

const created = await call('/api/visits', {
  method: 'POST', token,
  json: { ...visit, photo_consent: true, photos: [photo, photo, photo], notes: 'n'.repeat(600) },
});
evidence.valid_three_photo_visit = { status: created.status, expiry_present: Boolean(created.data.proof_expires_at) };

const proof = await call(`/api/proof/${created.data.proof_token}`);
evidence.proof = {
  status: proof.status,
  location: proof.data.location_label,
  photo_count: proof.data.photos?.length,
  extras_count: proof.data.extras?.length,
};

const badStatus = await call(`/api/proof/${created.data.proof_token}/respond`, {
  method: 'POST', json: { status: 'maybe', rating: 2, comment: '', extra_ids: [] },
});
const badRatingLow = await call(`/api/proof/${created.data.proof_token}/respond`, {
  method: 'POST', json: { status: 'problem', rating: 0, comment: '', extra_ids: [] },
});
const badRatingHigh = await call(`/api/proof/${created.data.proof_token}/respond`, {
  method: 'POST', json: { status: 'problem', rating: 6, comment: '', extra_ids: [] },
});
const tooManyExtras = await call(`/api/proof/${created.data.proof_token}/respond`, {
  method: 'POST', json: { status: 'problem', rating: 2, comment: '', extra_ids: Array(7).fill(extras[100_000].id) },
});
evidence.invalid_replies = {
  status: { status: badStatus.status, error: badStatus.data.error },
  rating_0: { status: badRatingLow.status, error: badRatingLow.data.error },
  rating_6: { status: badRatingHigh.status, error: badRatingHigh.data.error },
  seven_extras: { status: tooManyExtras.status, error: tooManyExtras.data.error },
};

const saved = await call(`/api/proof/${created.data.proof_token}/respond`, {
  method: 'POST',
  json: {
    status: 'problem', rating: 2,
    comment: 'Please check the entry glass next time.',
    extra_ids: [extras[100_000].id],
  },
});
evidence.valid_reply_after_errors = { status: saved.status, saved: saved.data.saved };

const visits = await call('/api/visits', { token });
const csv = await call(`/api/visits/${created.data.id}/export.csv`, { token });
evidence.workspace_after_reply = {
  status: visits.status,
  response_status: visits.data[0]?.response_status,
  rating: visits.data[0]?.rating,
  requested_extra_price: visits.data[0]?.requested_extras?.[0]?.price_cents,
};
evidence.csv = {
  status: csv.status,
  content_type: csv.headers['content-type'],
  content_disposition: csv.headers['content-disposition'],
  contains_1000: csv.data.includes('1000.00'),
  contains_extra: csv.data.includes('Extra 100000'),
};

const other = await call('/api/workspaces', { method: 'POST', json: { name: 'Other Tenant' } });
const crossTenant = await call(`/api/visits/${created.data.id}/export.csv`, { token: other.data.access_token });
evidence.cross_tenant_export = { status: crossTenant.status, error: crossTenant.data.error };

const moreWrites = [];
for (let i = 0; i < 3; i += 1) {
  moreWrites.push(await call('/api/visits', { method: 'POST', token, json: { ...visit, client_name: `Plan ${i}` } }));
}
evidence.free_plan_after_first_visit = moreWrites.map(result => ({ status: result.status, error: result.data.error }));

const concurrentWorkspace = await call('/api/workspaces', { method: 'POST', json: { name: 'Concurrent Boundary' } });
const concurrentWrites = await Promise.all(Array.from({ length: 8 }, (_, index) => call('/api/visits', {
  method: 'POST', token: concurrentWorkspace.data.access_token,
  headers: { 'x-forwarded-for': '203.0.113.211' },
  json: { ...visit, client_name: `Concurrent ${index}` },
})));
evidence.concurrent_free_plan = count(concurrentWrites.map(result => result.status));

const rateResponses = await Promise.all(Array.from({ length: 45 }, () => call('/api/not-found', {
  headers: { 'x-forwarded-for': '203.0.113.212' },
})));
evidence.rate_limit = {
  statuses: count(rateResponses.map(result => result.status)),
  retry_after_1: rateResponses.filter(result => result.status === 429 && result.headers['retry-after'] === '1').length,
};

const output = JSON.stringify(evidence, null, 2);
await writeFile(new URL('./local-boundary-flow.json', import.meta.url), output);
console.log(output);
