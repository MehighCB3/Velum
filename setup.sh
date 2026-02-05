#!/bin/bash

# Personal Assistant Setup Script
# Run this after installing Node.js 22+

set -e

echo "Personal Assistant Setup"
echo "=========================="
echo ""

# Check Node version
NODE_VERSION=$(node -v 2>/dev/null | cut -d'v' -f2 | cut -d'.' -f1)
if [ -z "$NODE_VERSION" ] || [ "$NODE_VERSION" -lt 22 ]; then
    echo "Node.js 22+ required. Install from https://nodejs.org"
    exit 1
fi
echo "Node.js version OK"

# Install OpenClaw
echo ""
echo "Installing OpenClaw..."
npm install -g openclaw@latest

# Create workspace directory
WORKSPACE="$HOME/.openclaw/workspace"
mkdir -p "$WORKSPACE/skills"

# Copy configuration files
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "Setting up workspace files..."
cp "$SCRIPT_DIR/workspace/SOUL.md" "$WORKSPACE/"
cp "$SCRIPT_DIR/workspace/AGENTS.md" "$WORKSPACE/"
cp "$SCRIPT_DIR/workspace/USER.md.template" "$WORKSPACE/USER.md"

# Copy skills
echo "Installing skills..."
cp -r "$SCRIPT_DIR/skills/"* "$WORKSPACE/skills/"

# Create config directory
mkdir -p "$HOME/.openclaw"

# Copy base config if none exists
if [ ! -f "$HOME/.openclaw/openclaw.json" ]; then
    cp "$SCRIPT_DIR/config/openclaw.json" "$HOME/.openclaw/"
    echo "Created base configuration"
else
    echo "Config exists, skipping (check config/openclaw.json for reference)"
fi

echo ""
echo "=========================="
echo "Setup complete!"
echo ""
echo "Next steps:"
echo "1. Edit ~/.openclaw/workspace/USER.md with your personal details"
echo "2. Run: openclaw onboard --install-daemon"
echo "3. Connect your preferred channel (WhatsApp/Telegram)"
echo ""
echo "Quick start:"
echo "  openclaw gateway --port 18789 --verbose"
echo ""
