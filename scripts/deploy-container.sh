#!/usr/bin/env bash
set -euo pipefail

slug=service-proof-loop
resource_group=sociobot
environment=factory-env
app_name=sf-service-proof-loop
storage_account=sociobotblob
share_name=service-proof-loop-data
storage_name=service-proof-loop-data

# The factory deployer builds the work-order Dockerfile and preserves the
# product's custom domain. SQLite additionally needs one durable writer.
/opt/fleet/lib/deploy-container.sh "$slug" "$(cd "$(dirname "$0")/.." && pwd)" Dockerfile 8080

az storage share-rm create \
  --resource-group "$resource_group" \
  --storage-account "$storage_account" \
  --name "$share_name" \
  --quota 5 \
  --only-show-errors \
  --output none

storage_key=$(az storage account keys list \
  --resource-group "$resource_group" \
  --account-name "$storage_account" \
  --query '[0].value' \
  --output tsv)

az containerapp env storage set \
  --resource-group "$resource_group" \
  --name "$environment" \
  --storage-name "$storage_name" \
  --access-mode ReadWrite \
  --azure-file-account-name "$storage_account" \
  --azure-file-account-key "$storage_key" \
  --azure-file-share-name "$share_name" \
  --only-show-errors \
  --output none

app_json=$(az containerapp show \
  --resource-group "$resource_group" \
  --name "$app_name" \
  --output json)
patch_body=$(jq -n \
  --argjson template "$(jq '.properties.template
    | .scale.minReplicas = 1
    | .scale.maxReplicas = 1
    | .volumes = [{"name":"data","storageName":"service-proof-loop-data","storageType":"AzureFile"}]
    | .containers[0].volumeMounts = [{"volumeName":"data","mountPath":"/data"}]' <<<"$app_json")" \
  '{properties:{template:$template}}')

subscription_id=${AZURE_SUBSCRIPTION_ID:-283af945-693b-4a6e-b952-df928d0a18a9}
az rest \
  --method patch \
  --url "https://management.azure.com/subscriptions/$subscription_id/resourceGroups/$resource_group/providers/Microsoft.App/containerApps/$app_name?api-version=2024-03-01" \
  --body "$patch_body" \
  --output none

az containerapp show \
  --resource-group "$resource_group" \
  --name "$app_name" \
  --query '{revision:properties.latestRevisionName,min:properties.template.scale.minReplicas,max:properties.template.scale.maxReplicas,volumes:properties.template.volumes,mounts:properties.template.containers[0].volumeMounts}' \
  --output json
