Prebuild locally → Zip Deploy (no Oryx)

This avoids any server-side Node/npm weirdness.

0) Vars
APP_RG="FoundryAI-PoC"
APP_NAME="triage-conductor-web-poc"

1) Ensure repo scripts & config
// package.json
{
  "scripts": {
    "build": "next build",
    "start": "next start -p ${PORT:-8080}"
  }
}

// next.config.js
module.exports = { output: 'standalone' };

2) Build locally with Node 20
# use Node 20 locally
node -v                       # should show v20.x
npm ci
npm run build

3) Assemble a minimal runtime bundle
rm -rf .deploy
mkdir -p .deploy/.next .deploy/public
# standalone server (includes server.js)
cp -r .next/standalone/* .deploy/
# static assets
cp -r .next/static .deploy/.next/static
# public assets (if any)
[ -d public ] && cp -r public/. .deploy/public/
# (optional) keep next.config.js (not required at runtime)

4) Zip-deploy and set startup
cd .deploy && zip -r ../app.zip . && cd ..

# Upload the prebuilt package
az webapp deploy -g "$APP_RG" -n "$APP_NAME" --src-path app.zip --type zip

# Force Node 20 + proper startup command (no Oryx)
az webapp config set -g "$APP_RG" -n "$APP_NAME" --linux-fx-version "NODE|20-lts"
az webapp config appsettings set -g "$APP_RG" -n "$APP_NAME" --settings \
  NODE_ENV=production PORT=8080 HOSTNAME=0.0.0.0 WEBSITE_NODE_DEFAULT_VERSION=~20

# Explicit startup (for standalone bundle)
az webapp config set -g "$APP_RG" -n "$APP_NAME" --startup-file "node server.js"

# Remove Azure default page if it lingers
az webapp ssh -g "$APP_RG" -n "$APP_NAME" --command "rm -f /home/site/wwwroot/hostingstart.html"

# Restart & tail logs
az webapp restart -g "$APP_RG" -n "$APP_NAME"
az webapp log tail -g "$APP_RG" -n "$APP_NAME"


You should see logs like Ready on http://0.0.0.0:8080. Visit:

https://triage-conductor-web-poc.azurewebsites.net