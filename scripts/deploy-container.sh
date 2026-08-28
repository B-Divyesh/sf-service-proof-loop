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
storage_name=$(jq -r '.storage_name' "$contract")
mount_path=$(jq -r '.storage_mount' "$contract")
min_replicas=$(jq -r '.scale.min_replicas' "$contract")
max_replicas=$(jq -r '.scale.max_replicas' "$contract")
revision_mode=$(jq -r '.active_revisions_mode' "$contract")
source_sha=$(git -C "$repo_dir" rev-parse HEAD)
image_tag="$app_name:${source_sha:0:12}"
image="$registry.azurecr.io/$image_tag"
management_url="https://management.azure.com/subscriptions/$subscription_id/resourceGroups/$resource_group/providers/Microsoft.App/containerApps/$app_name?api-version=2024-03-01"

if [ "$min_replicas" != 1 ] || [ "$max_replicas" != 1 ] || [ "$revision_mode" != Single ]; then
  echo "Deployment contract must keep SQLite at exactly one active replica." >&2
  exit 2
fi

az containerapp env storage show \
  --resource-group "$resource_group" \
  --name "$environment" \
  --storage-name "$storage_name" \
  --output none

echo "Building $image from $source_sha"
az acr build \
  --registry "$registry" \
  --image "$image_tag" \
  --file Dockerfile \
  --build-arg "BUILD_SHA=$source_sha" \
  --build-arg "GIT_SHA=$source_sha" \
  --build-arg "SOURCE_COMMIT=$source_sha" \
  "$repo_dir"

# Image, persistent storage, revision mode, and the one-replica ceiling change
# in one ARM template update. Future deployments use this same checked-in
# contract instead of the factory helper's generic 1..3 replica default.
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
    --query '{state:properties.provisioningState,revision:properties.latestRevisionName,mode:properties.configuration.activeRevisionsMode,min:properties.template.scale.minReplicas,max:properties.template.scale.maxReplicas,image:properties.template.containers[0].image,mount:properties.template.containers[0].volumeMounts[0].mountPath,storage:properties.template.volumes[0].storageName}' \
    --output json)
  if jq -e \
    --arg image "$image" \
    --arg storage "$storage_name" \
    --arg mount "$mount_path" \
    '.state == "Succeeded" and .mode == "Single" and .min == 1 and .max == 1 and .image == $image and .mount == $mount and .storage == $storage' \
    <<<"$live" >/dev/null; then
    break
  fi
  sleep 5
done

if ! jq -e \
  --arg image "$image" \
  --arg storage "$storage_name" \
  --arg mount "$mount_path" \
  '.state == "Succeeded" and .mode == "Single" and .min == 1 and .max == 1 and .image == $image and .mount == $mount and .storage == $storage' \
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

jq --argjson replicas "$replica_count" '. + {replicas:$replicas}' <<<"$live"
