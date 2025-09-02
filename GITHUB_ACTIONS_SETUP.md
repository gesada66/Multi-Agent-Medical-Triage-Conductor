# GitHub Actions Setup for Azure Deployment

This guide explains how to set up and use GitHub Actions for automated build and deployment to Azure.

## 🚀 Available Workflows

### 1. Azure Container Deployment (`azure-deployment.yml`)
Automated build, containerization, and deployment to Azure App Service.

**Features:**
- ✅ Docker container build and push to Azure Container Registry
- ✅ Automated Azure App Service deployment  
- ✅ Health checks and functionality verification
- ✅ Cost monitoring setup
- ✅ Resource cleanup scheduling
- ✅ Manual trigger only (no automatic deployments)

### 2. Azure Resource Cleanup (`azure-cleanup.yml`)
Automated cleanup of Azure resources to prevent unnecessary costs.

**Features:**
- ✅ Selective cleanup (staging-only, specific deployments, all resources)
- ✅ Cost savings estimation
- ✅ Safety confirmations required
- ✅ Manual trigger only (no automatic cleanup)

### 3. Medical Testing Suite (`medical-testing-suite.yml`)
Comprehensive testing pipeline for the medical triage system.

**Features:**
- ✅ Unit, integration, contract, and performance tests
- ✅ Medical compliance validation
- ✅ Cost optimization analysis
- ✅ Security and data compliance checks
- ✅ Manual trigger only (no automatic testing)

## ⚙️ Prerequisites Setup

### 1. Azure Service Principal

Create an Azure Service Principal for GitHub Actions:

```bash
# Login to Azure
az login

# Create service principal
az ad sp create-for-rbac \
  --name "GitHubActions-TriageApp" \
  --role contributor \
  --scopes /subscriptions/{subscription-id}/resourceGroups/FoundryAI-PoC \
  --sdk-auth
```

Copy the JSON output - you'll need this for GitHub secrets.

### 2. GitHub Repository Secrets

Add the following secrets to your GitHub repository (`Settings > Secrets and variables > Actions`):

| Secret Name | Description | Example |
|------------|-------------|---------|
| `AZURE_CREDENTIALS` | Service Principal JSON | `{"clientId": "...", "clientSecret": "...", ...}` |
| `ANTHROPIC_API_KEY` | Anthropic API key (for testing) | `sk-ant-...` |
| `OPENAI_API_KEY` | OpenAI API key (optional) | `sk-...` |

### 3. Azure Resource Group

Ensure the `FoundryAI-PoC` resource group exists:

```bash
az group create --name FoundryAI-PoC --location uksouth
```

## 🚀 Using the Deployment Workflow

### Manual Deployment

1. Go to **Actions** tab in GitHub
2. Select **🚀 Azure Container Deployment**
3. Click **Run workflow**
4. Configure options:
   - **Environment**: `staging` or `production`
   - **Resource cleanup**: Enable for automatic cleanup
   - **Cost monitoring**: Enable cost alerts

### Deployment Process

The workflow follows these steps:

1. **Prerequisites Check** (5 min)
   - Validates Azure credentials
   - Checks resource group exists
   - Estimates deployment costs

2. **Docker Build & Push** (15 min)
   - Creates Azure Container Registry
   - Builds optimized Docker image
   - Pushes to ACR

3. **Azure Deployment** (10 min)
   - Creates App Service Plan
   - Deploys container to App Service
   - Configures application settings

4. **Verification** (5 min)
   - Health checks
   - Basic functionality tests
   - Reports success/failure

### Expected Costs

| Resource | Monthly Cost | Purpose |
|----------|-------------|---------|
| App Service (B1) | ~$13.14 | Web application hosting |
| Container Registry (Basic) | ~$5.00 | Docker image storage |
| **Total** | **~$18.14** | **Complete deployment** |

## 🧹 Using the Cleanup Workflow

### Manual Cleanup

1. Go to **Actions** tab in GitHub
2. Select **🧹 Azure Resource Cleanup**
3. Click **Run workflow**
4. Configure cleanup:
   - **Scope**: Choose what to cleanup
   - **Pattern**: Specify deployment name (if applicable)  
   - **Confirmation**: Type `DELETE` to confirm

### Cleanup Scopes

| Scope | Description | Use Case |
|-------|-------------|----------|
| `staging-only` | Removes staging/temp deployments | Regular maintenance |
| `specific-deployment` | Removes specific named deployment | Target cleanup |
| `all-deployments` | Removes all apps and registries | Complete reset |
| `resource-group-empty` | Removes everything | Start fresh |

## 🧪 Using the Testing Workflow

### Manual Testing

1. Go to **Actions** tab in GitHub
2. Select **🏥 Medical Triage System - Comprehensive Testing Suite**
3. Click **Run workflow**
4. Configure testing:
   - **Scope**: `full`, `agents`, `adapters`, or `orchestrator`
   - **Performance tests**: Enable/disable
   - **Generate test data**: Refresh test datasets

## 🛡️ Safety Features

### Automatic Triggers Disabled

All workflows require **manual trigger** to prevent:
- ❌ Unexpected Azure costs
- ❌ Accidental resource deletion  
- ❌ Unintended API usage
- ❌ Production disruption

### Built-in Safeguards

- **Confirmation Required**: Deletion workflows require typing "DELETE"
- **Cost Estimation**: Shows expected costs before deployment
- **Health Checks**: Verifies deployments before marking success
- **Rollback Ready**: Failed deployments are logged for troubleshooting

## 🔧 Enabling Automatic Triggers (Optional)

### For Development Teams

To enable automatic deployment on code changes, uncomment in `azure-deployment.yml`:

```yaml
push:
  branches: [main]
  paths:
    - 'app/**'
    - 'lib/**'  
    - 'components/**'
    - 'Dockerfile'
    - 'package.json'
```

### For Cost Management

To enable daily cleanup of staging resources, uncomment in `azure-cleanup.yml`:

```yaml
schedule:
  - cron: '0 6 * * *'  # Daily at 6 AM UTC
```

## 📊 Monitoring and Maintenance

### GitHub Actions Usage

Monitor workflow usage in:
- **Actions** tab: Recent runs and status
- **Settings > Billing**: Actions usage and costs
- **Insights > Dependency graph**: Security alerts

### Azure Cost Management

Monitor Azure costs via:
- **Azure Portal**: Cost Management + Billing
- **Resource Group**: View all deployment resources
- **Budgets**: Set up cost alerts (recommended: $25/month)

## 🆘 Troubleshooting

### Common Issues

| Issue | Solution |
|-------|----------|
| `Azure login failed` | Check `AZURE_CREDENTIALS` secret format |
| `Resource group not found` | Create `FoundryAI-PoC` resource group |
| `Container build failed` | Check Dockerfile and dependencies |
| `Health check timeout` | Verify application starts correctly |
| `Cleanup permission denied` | Ensure service principal has contributor role |

### Support Workflow

1. **Check workflow logs** in Actions tab
2. **Verify Azure resources** in Azure Portal  
3. **Test locally** with same Docker commands
4. **Review secrets** and permissions
5. **Create GitHub issue** if needed

## 🎯 Best Practices

### Development Workflow

1. **Test locally first** before triggering workflows
2. **Use staging environment** for testing deployments  
3. **Monitor costs regularly** to avoid surprises
4. **Clean up resources** after testing/demos
5. **Keep secrets updated** and secure

### Production Deployment

1. **Enable automatic triggers** for production branch
2. **Set up cost budgets** and alerts
3. **Configure monitoring** and logging
4. **Plan backup/recovery** procedures
5. **Document deployment process** for team

---

## 📋 Quick Reference

### Manual Deployment
```
Actions > Azure Container Deployment > Run workflow
```

### Manual Cleanup  
```
Actions > Azure Resource Cleanup > Run workflow > Type "DELETE"
```

### Cost Check
```
Azure Portal > Cost Management > FoundryAI-PoC
```

### Emergency Stop
```bash
az group delete --name FoundryAI-PoC --yes --no-wait
```

**⚠️ Important**: All workflows are configured for safety - they will not run automatically and require manual triggers to prevent unexpected costs and deployments.