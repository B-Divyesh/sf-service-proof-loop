import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { assertDeploymentTopology } from '../scripts/verify-deployment.mjs';

const contract = JSON.parse(readFileSync(new URL('../.factory/deployment.json', import.meta.url), 'utf8'));
const fixture = name => JSON.parse(readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf8'));

test('accepts the checked-in durable single-writer topology', () => {
  const evidence = assertDeploymentTopology(
    contract,
    fixture('deployment-topology-valid.json'),
    '0123456789abcdef',
  );
  assert.deepEqual(
    { replicas: evidence.replicas, max: evidence.max_replicas, mount: evidence.mount_path },
    { replicas: 1, max: 1, mount: '/data' },
  );
});

test('rejects the verifier report topology with multiple ephemeral SQLite writers', () => {
  assert.throws(
    () => assertDeploymentTopology(
      contract,
      fixture('deployment-topology-verifier-failure.json'),
      'ccd99e6b3f1c42f3131cc18d9bc28c7af942bd76',
    ),
    /maximum replica count drifted from the deployment contract/,
  );
});

test('rejects ephemeral storage even if the replica ceiling is repaired', () => {
  const snapshot = fixture('deployment-topology-verifier-failure.json');
  snapshot.app.maxReplicas = 1;
  snapshot.revisions[0].replicas = 1;
  snapshot.replicas = 1;
  assert.throws(
    () => assertDeploymentTopology(contract, snapshot),
    /durable volume is not mounted at \/data/,
  );
});

test('rejects a second active revision even when the template ceiling is one', () => {
  const snapshot = fixture('deployment-topology-valid.json');
  snapshot.revisions[0] = { ...snapshot.revisions[0], active: true, replicas: 1 };
  assert.throws(
    () => assertDeploymentTopology(contract, snapshot),
    /exactly one revision must be active/,
  );
});
