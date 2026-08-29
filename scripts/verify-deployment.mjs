import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const contractPath = new URL('../.factory/deployment.json', import.meta.url);

function required(condition, message, evidence) {
  if (!condition) {
    const error = new Error(message);
    error.evidence = evidence;
    throw error;
  }
}

function azureJson(args) {
  return JSON.parse(execFileSync('az', [...args, '--output', 'json'], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }));
}

export function assertDeploymentTopology(contract, snapshot, expectedSha = '') {
  const { app, revisions, replicas } = snapshot;
  const active = revisions.filter(revision => revision.active);
  const totalReplicas = revisions.reduce((sum, revision) => sum + (revision.replicas || 0), 0);
  const mount = app.mounts?.find(item => item.mountPath === contract.storage_mount);
  const volume = app.volumes?.find(item => item.name === mount?.volumeName);

  required(app.provisioningState === 'Succeeded', 'container app provisioning is not complete', app);
  required(app.latestRevision === app.latestReadyRevision, 'latest revision is not ready', app);
  required(app.mode === contract.active_revisions_mode, 'active revision mode drifted from the deployment contract', app);
  required(app.minReplicas === contract.scale.min_replicas, 'minimum replica count drifted from the deployment contract', app);
  required(app.maxReplicas === contract.scale.max_replicas, 'maximum replica count drifted from the deployment contract', app);
  required(Boolean(mount), `durable volume is not mounted at ${contract.storage_mount}`, app);
  required(volume?.storageType === 'AzureFile', 'durable volume is not backed by Azure Files', app);
  required(volume?.storageName === contract.storage_name, 'mounted storage name drifted from the deployment contract', app);
  required(active.length === 1, 'exactly one revision must be active', revisions);
  required(active[0].name === app.latestRevision, 'the active revision is not the latest revision', { app, active });
  required(totalReplicas === 1, 'exactly one SQLite writer may be running across all revisions', revisions);
  required(replicas === 1, 'the active revision must have exactly one live replica', { replicas, active: active[0] });
  if (expectedSha) {
    required(app.image.endsWith(`:${expectedSha.slice(0, 12)}`), 'container image identity does not match EXPECTED_SHA', {
      image: app.image,
      expectedSha,
    });
  }

  return {
    latest_revision: app.latestRevision,
    active_revisions: active.length,
    replicas,
    min_replicas: app.minReplicas,
    max_replicas: app.maxReplicas,
    image: app.image,
    mount_path: mount.mountPath,
    storage_name: volume.storageName,
    storage_type: volume.storageType,
  };
}

export function loadLiveSnapshot(contract) {
  const target = ['--resource-group', contract.resource_group, '--name', contract.app_name];
  const app = azureJson(['containerapp', 'show', ...target, '--query', `{
    provisioningState:properties.provisioningState,
    latestRevision:properties.latestRevisionName,
    latestReadyRevision:properties.latestReadyRevisionName,
    mode:properties.configuration.activeRevisionsMode,
    minReplicas:properties.template.scale.minReplicas,
    maxReplicas:properties.template.scale.maxReplicas,
    image:properties.template.containers[0].image,
    mounts:properties.template.containers[0].volumeMounts,
    volumes:properties.template.volumes
  }`]);
  const revisions = azureJson(['containerapp', 'revision', 'list', ...target, '--query', `[].{
    name:name,
    active:properties.active,
    replicas:properties.replicas
  }`]);
  const replicas = azureJson(['containerapp', 'replica', 'list', ...target, '--revision', app.latestRevision, '--query', 'length(@)']);
  return { app, revisions, replicas };
}

export function verifyDeployment({ fixturePath, expectedSha = process.env.EXPECTED_SHA || '' } = {}) {
  const contract = JSON.parse(readFileSync(contractPath, 'utf8'));
  const snapshot = fixturePath
    ? JSON.parse(readFileSync(fixturePath, 'utf8'))
    : loadLiveSnapshot(contract);
  return assertDeploymentTopology(contract, snapshot, expectedSha);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const evidence = verifyDeployment({ fixturePath: process.env.DEPLOYMENT_TOPOLOGY_FIXTURE });
    console.log(JSON.stringify(evidence, null, 2));
  } catch (error) {
    console.error(`Deployment topology verification failed: ${error.message}`);
    if (error.evidence) console.error(JSON.stringify(error.evidence, null, 2));
    process.exitCode = 1;
  }
}
