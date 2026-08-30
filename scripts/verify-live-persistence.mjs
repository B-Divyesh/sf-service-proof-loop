import { execFileSync } from 'node:child_process';
import http from 'node:http';
import https from 'node:https';
import { readFileSync } from 'node:fs';
import { verifyDeployment } from './verify-deployment.mjs';

const contract = JSON.parse(readFileSync(new URL('../.factory/deployment.json', import.meta.url), 'utf8'));
const base = new URL(process.env.LIVE_BASE_URL || 'https://service-proof-loop.sociobot.in');
const expectedSha = process.env.EXPECTED_SHA;
const transport = base.protocol === 'https:' ? https : http;

if (!expectedSha) {
  throw new Error('EXPECTED_SHA is required for a live restart-persistence check');
}

function call(path, { method = 'GET', headers = {} } = {}) {
  return new Promise((resolve, reject) => {
    const request = transport.request(new URL(path, base), {
      method,
      agent: false,
      headers: { connection: 'close', ...headers },
    }, response => {
      const chunks = [];
      response.on('data', chunk => chunks.push(chunk));
      response.on('end', () => {
        const text = Buffer.concat(chunks).toString('utf8');
        let data = text;
        try { data = JSON.parse(text); } catch {}
        resolve({ status: response.statusCode, data });
      });
    });
    request.on('error', reject);
    request.setTimeout(15_000, () => request.destroy(new Error(`Timed out: ${path}`)));
    request.end();
  });
}

function azureJson(args) {
  return JSON.parse(execFileSync('az', [...args, '--output', 'json'], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }));
}

function replicaNames(revision) {
  return azureJson([
    'containerapp', 'replica', 'list',
    '--resource-group', contract.resource_group,
    '--name', contract.app_name,
    '--revision', revision,
    '--query', '[].name',
  ]).sort();
}

function sameNames(left, right) {
  return left.length === right.length && left.every((name, index) => name === right[index]);
}

const before = verifyDeployment({ expectedSha });
const replicasBefore = replicaNames(before.latest_revision);
if (replicasBefore.length !== 1) throw new Error(`expected one replica before restart, found ${replicasBefore.length}`);

const client = `198.51.${Math.floor(Date.now() / 1000) % 200}.240`;
const demo = await call('/api/demo', { method: 'POST', headers: { 'x-forwarded-for': client } });
if (demo.status !== 200 || !demo.data?.access_token) throw new Error(`demo creation failed: ${demo.status}`);
const authorization = `Bearer ${demo.data.access_token}`;
const visitsBefore = await call('/api/visits', { headers: { authorization, 'x-forwarded-for': client } });
const visitBefore = visitsBefore.data?.[0];
if (visitsBefore.status !== 200 || !visitBefore?.id || !visitBefore?.proof_token) {
  throw new Error(`seeded visit was not readable before restart: ${visitsBefore.status}`);
}

execFileSync('az', [
  'containerapp', 'revision', 'restart',
  '--resource-group', contract.resource_group,
  '--name', contract.app_name,
  '--revision', before.latest_revision,
  '--output', 'none',
], { stdio: ['ignore', 'inherit', 'inherit'] });

let replicasAfter = replicasBefore;
let health;
for (let attempt = 0; attempt < 60; attempt += 1) {
  await new Promise(resolve => setTimeout(resolve, 3_000));
  try {
    replicasAfter = replicaNames(before.latest_revision);
    health = await call('/health');
    if (
      replicasAfter.length === 1
      && !sameNames(replicasBefore, replicasAfter)
      && health.status === 200
      && health.data?.build_sha === expectedSha
    ) break;
  } catch {}
}
if (sameNames(replicasBefore, replicasAfter)) throw new Error('the live replica did not restart');
if (health?.status !== 200 || health.data?.build_sha !== expectedSha) {
  throw new Error(`health did not recover with ${expectedSha}`);
}

const after = verifyDeployment({ expectedSha });
const visitsAfter = await call('/api/visits', { headers: { authorization, 'x-forwarded-for': client } });
const visitAfter = visitsAfter.data?.find(visit => visit.id === visitBefore.id);
if (visitsAfter.status !== 200 || !visitAfter) {
  throw new Error(`workspace state did not survive restart: ${visitsAfter.status}`);
}
const proofAfter = await call(`/api/proof/${encodeURIComponent(visitBefore.proof_token)}`, {
  headers: { 'x-forwarded-for': client },
});
if (proofAfter.status !== 200 || proofAfter.data?.id !== visitBefore.id) {
  throw new Error(`proof state did not survive restart: ${proofAfter.status}`);
}

console.log(JSON.stringify({
  build_sha: health.data.build_sha,
  revision: after.latest_revision,
  replicas_before: replicasBefore,
  replicas_after: replicasAfter,
  topology_after: after,
  persisted_workspace: true,
  persisted_visit: visitBefore.id,
  persisted_proof: true,
}, null, 2));
