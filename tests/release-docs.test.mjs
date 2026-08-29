import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

test('handoff keeps the researched and shipped commercial scopes explicit', () => {
  const handoff = readFileSync(new URL('../.factory/handoff.md', import.meta.url), 'utf8')
    .replaceAll('**', '')
    .replaceAll(/\s+/g, ' ');

  assert.match(handoff, /Commercial scope deviation/);
  assert.match(handoff, /\$59 per business each month plus technician seats/);
  assert.match(handoff, /\$59 one-time business license/);
});
