import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

test('commercial variance is explicitly accepted without rewriting the researched brief', () => {
  const brief = JSON.parse(readFileSync(new URL('../.factory/brief.json', import.meta.url), 'utf8'));
  const decision = JSON.parse(readFileSync(new URL('../.factory/scope-decision.json', import.meta.url), 'utf8'));
  const handoff = readFileSync(new URL('../.factory/handoff.md', import.meta.url), 'utf8')
    .replaceAll('**', '')
    .replaceAll(/\s+/g, ' ');

  assert.equal(brief.monetization, '$59 per business each month plus technician seats');
  assert.equal(decision.status, 'accepted-product-contract-variance');
  assert.equal(decision.researched_scope, brief.monetization);
  assert.equal(decision.delivery_scope, '$59 one-time business license for one workspace');
  assert.match(decision.reason, /Sociobot paid-unlock contract/);
  assert.match(decision.accepted_by, /service-proof-loop-repair-10 work order/);
  assert.match(decision.acceptance, /explicitly accepts the one-time license/);
  assert.match(handoff, /Formal commercial scope decision/);
  assert.match(handoff, /\.factory\/scope-decision\.json/);
  assert.match(handoff, /\$59 per business each month plus technician seats/);
  assert.match(handoff, /\$59 one-time business license for one workspace/);
});

test('paid copy states one workspace and makes no unlimited claim', () => {
  const frontend = readFileSync(new URL('../frontend/src/main.ts', import.meta.url), 'utf8');
  const readme = readFileSync(new URL('../README.md', import.meta.url), 'utf8');
  const claims = JSON.parse(readFileSync(new URL('../.factory/claims.json', import.meta.url), 'utf8'));

  assert.doesNotMatch(frontend, /unlimited/i);
  assert.doesNotMatch(readme, /unlimited/i);
  assert.match(frontend, /one \$59 license covers one business workspace/);
  assert.match(readme, /license\nadds more visits to one business workspace/);
  assert.equal(
    claims.filter(claim => claim.id === 'license-workspace-boundary').length,
    1,
  );
});

test('every registered claim has exactly one tagged regression', () => {
  const claims = JSON.parse(readFileSync(new URL('../.factory/claims.json', import.meta.url), 'utf8'));
  const sources = [
    '../tests/api.rs',
    '../tests/e2e/product.spec.ts',
    '../tests/runtime-default.test.mjs',
    '../scripts/verify-live.mjs',
  ].map(path => readFileSync(new URL(path, import.meta.url), 'utf8')).join('\n');
  const taggedIds = [...sources.matchAll(/@claim:([a-z0-9-]+)/g)].map(match => match[1]);

  assert.deepEqual([...new Set(taggedIds)].sort(), claims.map(claim => claim.id).sort());
  for (const claim of claims) {
    assert.equal(
      taggedIds.filter(id => id === claim.id).length,
      1,
      `${claim.id} must have exactly one tagged regression`,
    );
  }
});
