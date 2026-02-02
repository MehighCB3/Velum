#!/bin/bash
# Auto-deploy and refresh script
# Usage: ./deploy-and-refresh.sh

echo "🚀 Starting auto-deployment..."

# Get the latest commit hash
COMMIT=$(git rev-parse --short HEAD)
echo "📦 Deploying commit: $COMMIT"

# Push to GitHub (triggers auto-deploy if GitHub Actions is set up)
git push origin main

# Alternative: Deploy directly with Vercel CLI
echo "⏳ Deploying to Vercel..."
cd velum-app
vercel --prod --yes

echo "⏳ Waiting for deployment to propagate..."
sleep 25

echo "🔄 Refreshing browser..."
# Open the site (macOS)
open "https://velum-five.vercel.app"

echo "✅ Done! Site should be live with latest changes."
