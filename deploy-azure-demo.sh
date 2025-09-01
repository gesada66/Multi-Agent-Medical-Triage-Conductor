#!/bin/bash

# Azure Demo Deployment Script
# Deploys Multi-Agent Medical Triage system to Azure Container Instances
# ⚠️  IMPORTANT: Run cleanup script after demo to avoid charges!

set -e

# Configuration
RESOURCE_GROUP="FoundryAI-PoC"
LOCATION="uksouth"
APP_NAME="triage-demo"
CONTAINER_NAME="${APP_NAME}-$(date +%s)"
ACR_NAME="${APP_NAME}acr$(date +%s | tail -c 6)"
IMAGE_TAG="${APP_NAME}:latest"

echo "🚀 Starting Azure Demo Deployment..."
echo "📍 Resource Group: $RESOURCE_GROUP"
echo "🌍 Location: $LOCATION"
echo "📦 Container: $CONTAINER_NAME"

# Step 1: Create Azure Container Registry (cheapest option for image storage)
echo "📦 Creating Azure Container Registry..."
az acr create \
  --resource-group $RESOURCE_GROUP \
  --name $ACR_NAME \
  --sku Basic \
  --location $LOCATION \
  --admin-enabled true

# Get ACR credentials
ACR_SERVER=$(az acr show --name $ACR_NAME --query loginServer --output tsv)
ACR_USERNAME=$(az acr credential show --name $ACR_NAME --query username --output tsv)
ACR_PASSWORD=$(az acr credential show --name $ACR_NAME --query passwords[0].value --output tsv)

echo "🔑 ACR Server: $ACR_SERVER"

# Step 2: Build and push Docker image
echo "🔨 Building Docker image..."
docker build -t $IMAGE_TAG .

echo "🏷️  Tagging image for ACR..."
docker tag $IMAGE_TAG $ACR_SERVER/$IMAGE_TAG

echo "📤 Logging into ACR..."
az acr login --name $ACR_NAME

echo "⬆️  Pushing image to ACR..."
docker push $ACR_SERVER/$IMAGE_TAG

# Step 3: Deploy to Azure Container Instances
echo "☁️  Deploying to Azure Container Instances..."

# Prompt for API key (secure input)
echo "🔐 Enter your Anthropic API Key (or press Enter for mock mode):"
read -s ANTHROPIC_KEY
if [ -z "$ANTHROPIC_KEY" ]; then
  echo "⚠️  No API key provided - deploying in mock mode"
  MOCK_MODE="true"
  ANTHROPIC_KEY="sk-ant-mock-key"
else
  MOCK_MODE="false"
  echo "✅ API key provided - deploying with live API"
fi

# Create container instance
az container create \
  --resource-group $RESOURCE_GROUP \
  --name $CONTAINER_NAME \
  --image $ACR_SERVER/$IMAGE_TAG \
  --cpu 1 \
  --memory 2 \
  --registry-login-server $ACR_SERVER \
  --registry-username $ACR_USERNAME \
  --registry-password $ACR_PASSWORD \
  --dns-name-label $CONTAINER_NAME \
  --ports 3000 \
  --environment-variables \
    APP_MODE=LOCAL \
    MODEL_PROVIDER=anthropic \
    ANTHROPIC_API_KEY="$ANTHROPIC_KEY" \
    ANTHROPIC_MODEL=claude-3-5-haiku-20241022 \
    ANTHROPIC_ENABLE_CACHING=true \
    ANTHROPIC_ENABLE_BATCHING=true \
    MOCK_LLM_RESPONSES="$MOCK_MODE" \
    NODE_ENV=production \
    LOG_LEVEL=info \
    ENABLE_TELEMETRY=false

# Get deployment info
FQDN=$(az container show --resource-group $RESOURCE_GROUP --name $CONTAINER_NAME --query ipAddress.fqdn --output tsv)
IP=$(az container show --resource-group $RESOURCE_GROUP --name $CONTAINER_NAME --query ipAddress.ip --output tsv)

echo ""
echo "🎉 Deployment Complete!"
echo "🌐 Demo URL: http://$FQDN:3000"
echo "🔗 IP Address: http://$IP:3000"
echo "📊 Health Check: http://$FQDN:3000/api/health"
echo ""
echo "⚠️  IMPORTANT: Run './cleanup-azure-demo.sh' after your demo to delete resources!"
echo ""

# Save deployment info for cleanup
cat > deployment-info.json << EOF
{
  "resourceGroup": "$RESOURCE_GROUP",
  "containerName": "$CONTAINER_NAME",
  "acrName": "$ACR_NAME",
  "deploymentTime": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "demoUrl": "http://$FQDN:3000"
}
EOF

echo "💾 Deployment info saved to deployment-info.json"
echo "🕐 Estimated hourly cost: ~$0.05-0.10 USD"
echo ""
echo "🧪 Testing the deployment..."
curl -f "http://$FQDN:3000/api/health" && echo "✅ Health check passed!" || echo "❌ Health check failed"

echo ""
echo "🎯 Demo Ready! Try these endpoints:"
echo "   • Main UI: http://$FQDN:3000"
echo "   • Health: http://$FQDN:3000/api/health"
echo "   • API Test: curl -X POST http://$FQDN:3000/api/triage -H 'Content-Type: application/json' -d '{\"mode\":\"patient\",\"input\":{\"text\":\"chest pain\"},\"patientId\":\"demo-001\"}'"