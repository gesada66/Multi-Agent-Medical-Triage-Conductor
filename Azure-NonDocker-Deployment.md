# Azure Non-Docker Deployment Alternative

This document describes an alternative deployment approach using local build + ZIP deploy instead of Docker containers.

## Benefits of Non-Docker Approach

- ✅ **Simpler Infrastructure**: No Azure Container Registry required
- ✅ **Lower Costs**: Only App Service costs, no ACR storage fees
- ✅ **Faster Deployment**: Pre-built locally, faster upload
- ✅ **Build Control**: Full control over build environment
- ✅ **Troubleshooting**: Easier to debug local builds vs container builds

## Prerequisites

- Node.js 20.x installed locally
- Azure CLI logged in
- Resource Group `FoundryAI-PoC` exists

## Deployment Steps

### 1. Environment Variables
```bash
APP_RG="FoundryAI-PoC"
APP_NAME="triage-webapp-$(date +%s)"  # Unique name
APP_PLAN="triage-webapp-plan"
APP_LOCATION="uksouth"
```

### 2. Create App Service Plan & Web App
```bash
# Create Linux App Service plan (B1 tier for demo)
az appservice plan create \
  --name "$APP_PLAN" \
  --resource-group "$APP_RG" \
  --sku B1 \
  --is-linux \
  --location "$APP_LOCATION"

# Create Web App targeting Node 20
az webapp create \
  --name "$APP_NAME" \
  --resource-group "$APP_RG" \
  --plan "$APP_PLAN" \
  --runtime "NODE|20-lts"
```

### 3. Local Build Process
```bash
# Ensure Node 20 is being used
node -v  # Should show v20.x

# Install dependencies and build
npm ci
npm run build

# Verify standalone build was created
ls -la .next/standalone/
```

### 4. Prepare Deployment Bundle
```bash
# Clean previous deployment
rm -rf .deploy app.zip

# Create deployment structure
mkdir -p .deploy/.next .deploy/public

# Copy standalone server (includes server.js)
cp -r .next/standalone/* .deploy/

# Copy static assets
cp -r .next/static .deploy/.next/static

# Copy public assets (if any)
[ -d public ] && cp -r public/. .deploy/public/

# Optional: Copy next.config.js (not required at runtime)
cp next.config.js .deploy/ 2>/dev/null || true
```

### 5. Deploy via ZIP
```bash
# Create deployment package
cd .deploy && zip -r ../app.zip . && cd ..

# Upload prebuilt package
az webapp deploy \
  --resource-group "$APP_RG" \
  --name "$APP_NAME" \
  --src-path app.zip \
  --type zip
```

### 6. Configure Runtime
```bash
# Force Node 20 runtime
az webapp config set \
  --resource-group "$APP_RG" \
  --name "$APP_NAME" \
  --linux-fx-version "NODE|20-lts"

# Set environment variables
az webapp config appsettings set \
  --resource-group "$APP_RG" \
  --name "$APP_NAME" \
  --settings \
    NODE_ENV=production \
    PORT=8080 \
    HOSTNAME=0.0.0.0 \
    WEBSITE_NODE_DEFAULT_VERSION=~20 \
    MODEL_PROVIDER=anthropic \
    MOCK_LLM_RESPONSES=false \
    APP_MODE=LOCAL

# Set explicit startup command for standalone bundle
az webapp config set \
  --resource-group "$APP_RG" \
  --name "$APP_NAME" \
  --startup-file "node server.js"
```

### 7. Remove Azure Default Page & Start
```bash
# Remove default Azure page that might mask our app
az webapp ssh \
  --resource-group "$APP_RG" \
  --name "$APP_NAME" \
  --command "rm -f /home/site/wwwroot/hostingstart.html"

# Restart and monitor
az webapp restart --resource-group "$APP_RG" --name "$APP_NAME"
az webapp log tail --resource-group "$APP_RG" --name "$APP_NAME"
```

### 8. Verify Deployment
```bash
# Get app URL
APP_URL=$(az webapp show --resource-group "$APP_RG" --name "$APP_NAME" --query defaultHostName --output tsv)
echo "App URL: https://$APP_URL"

# Test endpoints
curl -f "https://$APP_URL/api/health"
```

## Troubleshooting

### Build Issues
```bash
# If local build fails, check Node version
node -v

# Clear caches and retry
rm -rf .next node_modules package-lock.json
npm install
npm run build
```

### Runtime Issues
```bash
# Check logs for startup errors
az webapp log tail --resource-group "$APP_RG" --name "$APP_NAME"

# Verify startup command
az webapp config show --resource-group "$APP_RG" --name "$APP_NAME" \
  --query "startupFile" --output tsv

# Check environment variables
az webapp config appsettings list --resource-group "$APP_RG" --name "$APP_NAME"
```

### Common Issues
- **502 Bad Gateway**: Check PORT environment variable is 8080
- **Blank page**: Ensure hostingstart.html was removed
- **Asset 404s**: Verify .next/static was copied correctly
- **Build errors**: Use Node 20.x locally to match Azure runtime

## Cleanup
```bash
# Remove resources when done
az webapp delete --resource-group "$APP_RG" --name "$APP_NAME"
az appservice plan delete --resource-group "$APP_RG" --name "$APP_PLAN" --yes
```

## Cost Comparison

| Component | Docker Approach | Non-Docker Approach |
|-----------|----------------|-------------------|
| App Service | ~$13.14/month | ~$13.14/month |
| Container Registry | ~$5.00/month | $0 |
| **Total** | **~$18.14/month** | **~$13.14/month** |

**Savings**: ~$5/month (27% cheaper)

## When to Use This Approach

**Use Non-Docker when:**
- Cost optimization is important
- Simple deployment preferred
- Local build environment is stable
- No complex dependencies

**Use Docker when:**
- Environment consistency is critical
- Complex runtime dependencies
- Multi-service architectures
- CI/CD pipeline integration required

---

## Comparison with Docker Approach

| Aspect | Non-Docker (ZIP Deploy) | Docker Container |
|--------|------------------------|------------------|
| **Complexity** | Simple | More complex |
| **Cost** | Lower ($13/month) | Higher ($18/month) |
| **Build Speed** | Faster (local) | Slower (multi-stage) |
| **Environment Consistency** | Platform dependent | Fully consistent |
| **Troubleshooting** | Easier (direct logs) | Container abstractions |
| **Infrastructure** | App Service only | App Service + ACR |

Both approaches are valid - choose based on your priorities for cost, consistency, and operational complexity.