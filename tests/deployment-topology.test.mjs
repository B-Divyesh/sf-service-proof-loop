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

test('rejects verifier 9\'s exact three-replica ephemeral SQLite topology', () => {
  assert.throws(
    () => assertDeploymentTopology(
      contract,
      fixture('deployment-topology-verifier-failure.json'),
      '7fbc18756626b21a0633d96210b8c330d82e9a44',
    ),
    /maximum replica count drifted from the deployment contract/,
  );
});

test('rejects verifier 10\'s exact candidate topology before any functional probe', () => {
  assert.throws(
    () => assertDeploymentTopology(
      contract,
      fixture('deployment-topology-verifier-10.json'),
      'f85577356b7108ad203b5e802c1180b8b497b914',
    ),
    /maximum replica count drifted from the deployment contract/,
  );
});

test('rejects verifier 11\'s exact candidate image with three ephemeral writers', () => {
  assert.throws(
    () => assertDeploymentTopology(
      contract,
      fixture('deployment-topology-verifier-11.json'),
      '76bb34982a36bc6de33ffec0e9400e652847c5be',
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
