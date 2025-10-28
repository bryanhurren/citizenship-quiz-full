#!/bin/bash

# Deployment script for CitizenshipQuiz Web App
# This ensures we always deploy from the correct directory

set -e  # Exit on error

echo "🚀 Deploying CitizenshipQuiz Web App..."
echo ""

# Always deploy from CitizenshipQuizWeb directory
cd "$(dirname "$0")/CitizenshipQuizWeb"

echo "📂 Working directory: $(pwd)"
echo ""

# Deploy to production
npx vercel --prod --force

echo ""
echo "✅ Deployment complete!"
echo "🌐 Visit: https://www.theeclodapps.com"
