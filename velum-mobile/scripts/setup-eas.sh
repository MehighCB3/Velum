#!/usr/bin/env bash
set -euo pipefail

# ──────────────────────────────────────────────────────────
# Velum — One-Time EAS Setup
# ──────────────────────────────────────────────────────────
# This script sets up Expo Application Services (EAS) for
# OTA (Over-The-Air) updates. Run once, then all JS changes
# deploy instantly without rebuilding the APK.
#
# Usage:
#   cd velum-mobile
#   ./scripts/setup-eas.sh
# ──────────────────────────────────────────────────────────

cd "$(dirname "$0")/.."

echo ""
echo "╔══════════════════════════════════════════════════╗"
echo "║     Velum — EAS Setup for OTA Updates           ║"
echo "╠══════════════════════════════════════════════════╣"
echo "║  This sets up instant JS updates (no APK build) ║"
echo "║  Run this once, then 'eas update' deploys in    ║"
echo "║  seconds instead of hours.                      ║"
echo "╚══════════════════════════════════════════════════╝"
echo ""

# Step 1: Check prerequisites
echo "▸ Checking prerequisites..."

if ! command -v node &>/dev/null; then
  echo "✗ Node.js not found. Install from https://nodejs.org"
  exit 1
fi
echo "  ✓ Node.js $(node -v)"

if ! command -v npx &>/dev/null; then
  echo "✗ npx not found. Comes with Node.js — try reinstalling."
  exit 1
fi

# Step 2: Install EAS CLI
echo ""
echo "▸ Installing EAS CLI..."
npm install -g eas-cli 2>/dev/null || sudo npm install -g eas-cli

echo "  ✓ EAS CLI $(eas --version)"

# Step 3: Login to Expo
echo ""
echo "▸ Logging in to Expo..."
echo "  (Create a free account at https://expo.dev/signup if you don't have one)"
echo ""
eas login

# Step 4: Initialize EAS project
echo ""
echo "▸ Initializing EAS project..."
echo "  This links your local project to your Expo account"
echo "  and generates a real project ID."
echo ""
eas init

# Step 5: Get the project ID and update app.json
echo ""
echo "▸ Checking project configuration..."
PROJECT_ID=$(node -p "
  try {
    const c = require('./app.json');
    c.expo.extra.eas.projectId;
  } catch { '' }
")

if [ -z "$PROJECT_ID" ] || [ "$PROJECT_ID" = "velum-mobile" ]; then
  echo ""
  echo "  ⚠  Project ID not auto-updated in app.json."
  echo "  Check app.json → expo.extra.eas.projectId"
  echo "  It should be a UUID like: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
  echo ""
  echo "  Also update the 'updates.url' field to:"
  echo "  https://u.expo.dev/<your-project-id>"
else
  echo "  ✓ Project ID: $PROJECT_ID"

  # Update the updates URL with the real project ID
  node -e "
    const fs = require('fs');
    const config = JSON.parse(fs.readFileSync('app.json', 'utf8'));
    config.expo.updates.url = 'https://u.expo.dev/' + config.expo.extra.eas.projectId;
    fs.writeFileSync('app.json', JSON.stringify(config, null, 2) + '\n');
    console.log('  ✓ Updated updates.url in app.json');
  "
fi

# Step 6: Get Expo token for CI
echo ""
echo "▸ GitHub Actions setup..."
echo ""
echo "  To enable automatic OTA deploys from GitHub Actions,"
echo "  create an access token and add it as a repository secret:"
echo ""
echo "  1. Go to: https://expo.dev/accounts/[your-username]/settings/access-tokens"
echo "  2. Create a new token (name it 'GITHUB_ACTIONS')"
echo "  3. Go to: https://github.com/MehighCB3/Velum/settings/secrets/actions"
echo "  4. Add secret: EXPO_TOKEN = <your token>"
echo ""

# Step 7: Test with a dry run
echo "▸ Testing EAS Update..."
echo "  Running: eas update --branch production --message 'Initial setup' --non-interactive"
echo ""

if eas update --branch production --message "Initial OTA setup" --non-interactive; then
  echo ""
  echo "═══════════════════════════════════════════════════"
  echo "  ✓ EAS Setup Complete!"
  echo ""
  echo "  How it works now:"
  echo "  • Push JS changes to main → auto OTA update (seconds)"
  echo "  • Push a v* tag → full APK build (for native changes)"
  echo "  • Manual: eas update --branch production --message 'fix X'"
  echo "═══════════════════════════════════════════════════"
else
  echo ""
  echo "  ⚠ EAS Update test failed. Check your project ID and token."
  echo "  You can retry manually: eas update --branch production --message 'test'"
fi
