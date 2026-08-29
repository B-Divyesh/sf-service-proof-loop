#!/usr/bin/env bash
set -euo pipefail

repo_dir=$(cd "$(dirname "$0")/.." && pwd)
contract="$repo_dir/.factory/deployment.json"
slug=service-proof-loop
registry=sociobotregistry
subscription_id=${AZURE_SUBSCRIPTION_ID:-283af945-693b-4a6e-b952-df928d0a18a9}
resource_group=$(jq -r '.resource_group' "$contract")
environment=$(jq -r '.environment' "$contract")
app_name=$(jq -r '.app_name' "$contract")
state_backend=$(jq -r '.state_backend' "$contract")
storage_name=$(jq -r '.storage_name' "$contract")
mount_path=$(jq -r '.storage_mount' "$contract")
min_replicas=$(jq -r '.scale.min_replicas' "$contract")
max_replicas=$(jq -r '.scale.max_replicas' "$contract")
revision_mode=$(jq -r '.active_revisions_mode' "$contract")
drain_writers=$(jq -r '.rollout.drain_writers' "$contract")
source_sha=$(git -C "$repo_dir" rev-parse HEAD)
image_tag="$app_name:${source_sha:0:12}"
image=${PREBUILT_IMAGE:-$registry.azurecr.io/$image_tag}
management_url="https://management.azure.com/subscriptions/$subscription_id/resourceGroups/$resource_group/providers/Microsoft.App/containerApps/$app_name?api-version=2024-03-01"

if [ "$state_backend" != durable-single-writer-sqlite ] || [ "$mount_path" != /data ] || [ "$min_replicas" != 1 ] || [ "$max_replicas" != 1 ] || [ "$revision_mode" != Single ] || [ "$drain_writers" != true ]; then
  echo "Deployment contract must mount durable SQLite storage at /data with exactly one active replica." >&2
  exit 2
fi

az containerapp env storage show \
  --resource-group "$resource_group" \
  --name "$environment" \
  --storage-name "$storage_name" \
  --query '{accessMode:properties.azureFile.accessMode,shareName:properties.azureFile.shareName}' \
  --output json | jq -e '.accessMode == "ReadWrite" and (.shareName | length > 0)' >/dev/null

if [ -z "${PREBUILT_IMAGE:-}" ]; then
  echo "Building $image from $source_sha"
  az acr build \
    --registry "$registry" \
    --image "$image_tag" \
    --file Dockerfile \
    --build-arg "BUILD_SHA=$source_sha" \
    --build-arg "GIT_SHA=$source_sha" \
    --build-arg "SOURCE_COMMIT=$source_sha" \
    "$repo_dir"
else
  echo "Deploying prebuilt image $image for $source_sha"
fi

# Azure Files does not provide SQLite's advisory byte-range locking semantics.
# The runtime uses SQLite's single-process VFS, so all old writers must stop
# before a new revision can mount the database. A failed rollout reactivates
# the prior ready revision.
previous_ready=$(az containerapp show \
  --resource-group "$resource_group" \
  --name "$app_name" \
  --query properties.latestReadyRevisionName \
  --output tsv)
rollback_needed=0
rollback() {
  if [ "$rollback_needed" -eq 1 ] && [ -n "$previous_ready" ]; then
    echo "Reactivating prior ready revision $previous_ready after failed rollout." >&2
    az containerapp revision activate \
      --resource-group "$resource_group" \
      --name "$app_name" \
      --revision "$previous_ready" \
      --output none || true
  fi
}
trap rollback EXIT

rollback_needed=1
active_revisions=$(az containerapp revision list \
  --resource-group "$resource_group" \
  --name "$app_name" \
  --query '[?properties.active].name' \
  --output tsv)
for revision in $active_revisions; do
  az containerapp revision deactivate \
    --resource-group "$resource_group" \
    --name "$app_name" \
    --revision "$revision" \
    --output none
done
for _ in $(seq 1 60); do
  replica_total=$(az containerapp revision list \
    --resource-group "$resource_group" \
    --name "$app_name" \
    --output json | jq '[.[].properties.replicas // 0] | add // 0')
  if [ "$replica_total" -eq 0 ]; then
    break
  fi
  sleep 2
done
if [ "$replica_total" -ne 0 ]; then
  echo "Existing SQLite writers did not drain before deployment." >&2
  false
fi

# Image, durable storage, revision mode, and the one-replica ceiling change in
# one ARM template update. SQLite and the in-memory rate limiter therefore have
# one public writer and one public allowance.
app_json=$(az containerapp show \
  --resource-group "$resource_group" \
  --name "$app_name" \
  --output json)
template=$(jq \
  --arg image "$image" \
  --arg storage "$storage_name" \
  --arg mount "$mount_path" \
  --argjson min "$min_replicas" \
  --argjson max "$max_replicas" \
  '.properties.template
   | .containers[0].image = $image
   | .containers[0].env = [{"name":"PORT","value":"8080"}]
   | .containers[0].volumeMounts = [{"volumeName":"data","mountPath":$mount}]
   | .volumes = [{"name":"data","storageType":"AzureFile","storageName":$storage}]
   | .scale.minReplicas = $min
   | .scale.maxReplicas = $max
   | del(.scale.cooldownPeriod, .scale.pollingInterval)
   | .scale.rules = null' <<<"$app_json")
patch_body=$(jq -n \
  --arg mode "$revision_mode" \
  --argjson template "$template" \
  '{properties:{configuration:{activeRevisionsMode:$mode},template:$template}}')

az rest \
  --method patch \
  --url "$management_url" \
  --body "$patch_body" \
  --output none

for _ in $(seq 1 60); do
  live=$(az containerapp show \
    --resource-group "$resource_group" \
    --name "$app_name" \
    --query '{state:properties.provisioningState,revision:properties.latestRevisionName,mode:properties.configuration.activeRevisionsMode,min:properties.template.scale.minReplicas,max:properties.template.scale.maxReplicas,image:properties.template.containers[0].image,mount:properties.template.containers[0].volumeMounts[0].mountPath,storage:properties.template.volumes[0].storageName,storageType:properties.template.volumes[0].storageType}' \
    --output json)
  if jq -e \
    --arg image "$image" \
    --arg storage "$storage_name" \
    --arg mount "$mount_path" \
    '.state == "Succeeded" and .mode == "Single" and .min == 1 and .max == 1 and .image == $image and .mount == $mount and .storage == $storage and .storageType == "AzureFile"' \
    <<<"$live" >/dev/null; then
    break
  fi
  sleep 5
done

if ! jq -e \
  --arg image "$image" \
  --arg storage "$storage_name" \
  --arg mount "$mount_path" \
  '.state == "Succeeded" and .mode == "Single" and .min == 1 and .max == 1 and .image == $image and .mount == $mount and .storage == $storage and .storageType == "AzureFile"' \
  <<<"$live" >/dev/null; then
  echo "Deployment did not converge to the checked-in single-replica contract." >&2
  jq . <<<"$live" >&2
  exit 1
fi

for _ in $(seq 1 60); do
  health=$(curl --silent --show-error --fail "https://$slug.sociobot.in/health" || true)
  if jq -e --arg sha "$source_sha" '.status == "ok" and .build_sha == $sha' <<<"$health" >/dev/null 2>&1; then
    break
  fi
  sleep 5
done

if ! jq -e --arg sha "$source_sha" '.status == "ok" and .build_sha == $sha' <<<"$health" >/dev/null 2>&1; then
  echo "Live health identity did not reach $source_sha." >&2
  exit 1
fi

active_revision=$(jq -r '.revision' <<<"$live")
replica_count=$(az containerapp replica list \
  --resource-group "$resource_group" \
  --name "$app_name" \
  --revision "$active_revision" \
  --query 'length(@)' \
  --output tsv)
if [ "$replica_count" -ne 1 ]; then
  echo "Expected one live replica, found $replica_count." >&2
  exit 1
fi

rollback_needed=0
trap - EXIT
EXPECTED_SHA="$source_sha" node "$repo_dir/scripts/verify-deployment.mjs"
