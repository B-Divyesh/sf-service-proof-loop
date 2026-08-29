import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

const root = resolve(import.meta.dirname, '..');
const binary = resolve(root, 'target/release/service-proof-loop');

async function waitForHealth(child, logs) {
  const deadline = Date.now() + 15_000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error(`server exited before health check: ${logs.join('')}`);
    try {
      const response = await fetch('http://127.0.0.1:8080/health');
      if (response.ok) return response;
    } catch {}
    await new Promise(resolveWait => setTimeout(resolveWait, 100));
  }
  throw new Error(`server did not listen on port 8080: ${logs.join('')}`);
}

test('@claim:zero-config-runtime starts with an empty environment on port 8080', { timeout: 20_000 }, async () => {
  assert.ok(existsSync(binary), 'build the service binary before running this test');
  assert.ok(existsSync(resolve(root, 'dist/index.html')), 'build the frontend before running this test');

  const logs = [];
  const child = spawn(binary, [], { cwd: root, env: {}, stdio: ['ignore', 'pipe', 'pipe'] });
  child.stdout.on('data', chunk => logs.push(chunk.toString()));
  child.stderr.on('data', chunk => logs.push(chunk.toString()));

  try {
    const health = await waitForHealth(child, logs);
    assert.equal(health.status, 200);
    const identity = await health.json();
    assert.equal(identity.status, 'ok');
    assert.equal(typeof identity.build_sha, 'string');
    assert.ok(identity.build_sha.length > 0);
    const homepage = await fetch('http://127.0.0.1:8080/');
    assert.equal(homepage.status, 200);
    assert.match(await homepage.text(), /<title>Service Proof Loop — Send proof after each visit<\/title>/);
  } finally {
    if (child.exitCode === null) {
      child.kill('SIGTERM');
      await once(child, 'exit');
    }
  }
});
