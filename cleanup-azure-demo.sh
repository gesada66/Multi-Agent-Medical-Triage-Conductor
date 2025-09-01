#!/bin/bash

# Azure Demo Cleanup Script
# Run this script to delete all created resources and avoid ongoing costs

echo "🧹 Starting Azure resource cleanup..."

# Variables (update these if you used different names)
APP_RG="FoundryAI-PoC"
APP_NAME="triage-container-demo"
APP_PLAN="triage-container-plan"
ACR_NAME="triageacr54912"

echo "📊 Current resources in resource group:"
az resource list --resource-group "$APP_RG" --output table

echo ""
echo "⚠️  WARNING: This will DELETE all demo resources!"
echo "Resources to be deleted:"
echo "  - Web App: $APP_NAME"
echo "  - App Service Plan: $APP_PLAN"
echo "  - Container Registry: $ACR_NAME"
echo ""
read -p "Continue with deletion? (y/N): " confirm

if [[ $confirm =~ ^[Yy]$ ]]; then
    echo ""
    echo "🗑️  Deleting Web App: $APP_NAME"
    az webapp delete --name "$APP_NAME" --resource-group "$APP_RG" --yes

    echo "🗑️  Deleting App Service Plan: $APP_PLAN"
    az appservice plan delete --name "$APP_PLAN" --resource-group "$APP_RG" --yes

    echo "🗑️  Deleting Container Registry: $ACR_NAME"
    az acr delete --name "$ACR_NAME" --resource-group "$APP_RG" --yes

    echo ""
    echo "✅ Cleanup completed successfully!"
    echo "💰 All demo resources deleted - no ongoing costs"
    echo ""
    echo "📊 Remaining resources in resource group:"
    az resource list --resource-group "$APP_RG" --output table
else
    echo "❌ Cleanup cancelled"
fi
