# Deployment Instructions

## ⚠️ IMPORTANT - Always Deploy from CitizenshipQuizWeb

**DO NOT deploy from the root directory!**

The root directory contains old build files that should never be deployed.

## Correct Deployment Methods

### Option 1: Use the deployment script (RECOMMENDED)
```bash
cd /Users/bryanhurren/Documents/claude-test
./deploy.sh
```

### Option 2: Manual deployment
```bash
cd /Users/bryanhurren/Documents/claude-test/CitizenshipQuizWeb
npx vercel --prod
```

## Directory Structure

```
claude-test/                    # ❌ DO NOT DEPLOY FROM HERE
├── deploy.sh                   # ✅ Use this script
├── admin.html                  # (old, not used)
├── index.html                  # (old Expo build, not used)
└── CitizenshipQuizWeb/         # ✅ DEPLOY FROM HERE
    ├── src/
    ├── api/
    ├── dist/
    └── vercel.json
```

## What Was Fixed

1. ❌ Removed `.vercel/` config from root directory
2. ✅ Created `deploy.sh` script that always deploys from correct directory
3. ✅ Created this documentation

## If You Accidentally Deploy from Root

The website will show an old version. To fix:
```bash
cd /Users/bryanhurren/Documents/claude-test
./deploy.sh
```

This will deploy the correct version from CitizenshipQuizWeb.
