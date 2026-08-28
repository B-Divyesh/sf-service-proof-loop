#!/usr/bin/env bash
set -euo pipefail

slug=service-proof-loop
resource_group=sociobot
app_name=sf-service-proof-loop
# The factory deployer builds the work-order Dockerfile and preserves the
# product's custom domain. SQLite requires exactly one writer, so this wrapper
# immediately fixes the service at one replica after the base deployment.
/opt/fleet/lib/deploy-container.sh "$slug" "$(cd "$(dirname "$0")/.." && pwd)" Dockerfile 8080

app_json=$(az containerapp show \
  --resource-group "$resource_group" \
  --name "$app_name" \
  --output json)
patch_body=$(jq -n \
  --argjson template "$(jq '.properties.template
    | del(.scale.cooldownPeriod, .scale.pollingInterval)
    | .scale.minReplicas = 1
    | .scale.maxReplicas = 1
    | .volumes = null
    | .containers[0].volumeMounts = null' <<<"$app_json")" \
  '{properties:{template:$template}}')

subscription_id=${AZURE_SUBSCRIPTION_ID:-283af945-693b-4a6e-b952-df928d0a18a9}
az rest \
  --method patch \
  --url "https://management.azure.com/subscriptions/$subscription_id/resourceGroups/$resource_group/providers/Microsoft.App/containerApps/$app_name?api-version=2024-03-01" \
  --body "$patch_body" \
  --output none

for _ in $(seq 1 60); do
  app_state=$(az containerapp show \
    --resource-group "$resource_group" \
    --name "$app_name" \
    --query '[properties.provisioningState, properties.template.scale.maxReplicas]' \
    --output tsv)
  if [ "$app_state" = $'Succeeded\t1' ]; then
    break
  fi
  sleep 5
done

az containerapp show \
  --resource-group "$resource_group" \
  --name "$app_name" \
  --query '{revision:properties.latestRevisionName,min:properties.template.scale.minReplicas,max:properties.template.scale.maxReplicas}' \
  --output json
