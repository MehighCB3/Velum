#!/usr/bin/env bash
# bump-version.sh — atomically bump version in app.json + package.json
#
# Usage:
#   ./scripts/bump-version.sh 1.9.0       # set explicit version
#   ./scripts/bump-version.sh patch        # auto-increment patch (e.g. 1.8.0 → 1.8.1)
#   ./scripts/bump-version.sh minor        # auto-increment minor (e.g. 1.8.0 → 1.9.0)
#   ./scripts/bump-version.sh major        # auto-increment major (e.g. 1.8.0 → 2.0.0)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

APP_JSON="$ROOT/app.json"
PKG_JSON="$ROOT/package.json"

# ── Read current version ─────────────────────────────────────────────────────
CURRENT=$(node -p "require('$APP_JSON').expo.version")
echo "Current version: $CURRENT"

# ── Resolve target version ────────────────────────────────────────────────────
ARG="${1:-}"

if [[ -z "$ARG" ]]; then
  echo "Usage: $0 <version|patch|minor|major>"
  exit 1
fi

semver_bump() {
  local version="$1" part="$2"
  IFS='.' read -r major minor patch <<< "$version"
  case "$part" in
    major) echo "$((major + 1)).0.0" ;;
    minor) echo "${major}.$((minor + 1)).0" ;;
    patch) echo "${major}.${minor}.$((patch + 1))" ;;
  esac
}

case "$ARG" in
  patch|minor|major)
    NEW_VERSION=$(semver_bump "$CURRENT" "$ARG")
    ;;
  *)
    # Validate it looks like a semver
    if ! [[ "$ARG" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
      echo "Error: '$ARG' is not a valid semver (e.g. 1.9.0) or keyword (patch/minor/major)"
      exit 1
    fi
    NEW_VERSION="$ARG"
    ;;
esac

echo "New version:     $NEW_VERSION"

# ── Write both files ──────────────────────────────────────────────────────────
# app.json
node -e "
  const fs = require('fs');
  const data = JSON.parse(fs.readFileSync('$APP_JSON', 'utf8'));
  data.expo.version = '$NEW_VERSION';
  fs.writeFileSync('$APP_JSON', JSON.stringify(data, null, 2) + '\n');
"

# package.json
node -e "
  const fs = require('fs');
  const data = JSON.parse(fs.readFileSync('$PKG_JSON', 'utf8'));
  data.version = '$NEW_VERSION';
  fs.writeFileSync('$PKG_JSON', JSON.stringify(data, null, 2) + '\n');
"

echo "✓ Bumped $CURRENT → $NEW_VERSION in app.json + package.json"
echo ""
echo "Next steps:"
echo "  git add app.json package.json"
echo "  git commit -m \"chore: bump mobile version to $NEW_VERSION\""
