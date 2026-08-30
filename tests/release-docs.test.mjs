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
