#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────
# build-apk.sh — Build Velum Mobile APK (arm64) + GitHub Release
#
# Usage:
#   ./scripts/build-apk.sh           # uses version from app.json
#   ./scripts/build-apk.sh 1.3.0     # override version
#
# Prerequisites:
#   - Node.js & npm (with project deps installed)
#   - Java 17+ (JAVA_HOME set)
#   - Android SDK (ANDROID_HOME set, or at /opt/android-sdk)
#   - NDK 27.x installed via SDK manager
#   - gh CLI (optional, for auto-publishing GitHub Release)
# ─────────────────────────────────────────────────────────────
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_DIR"

# ── Resolve version ──────────────────────────────────────────
VERSION="${1:-$(node -p "require('./app.json').expo.version")}"
echo "Building Velum Mobile v${VERSION} (arm64)"

# ── Update version in app.json and package.json ─────────────
# Ensures Constants.expoConfig.version matches the built APK
CURRENT_APP_VERSION=$(node -p "require('./app.json').expo.version")
if [ "$VERSION" != "$CURRENT_APP_VERSION" ]; then
  echo "Updating app.json version: $CURRENT_APP_VERSION → $VERSION"
  node -e "
    const fs = require('fs');
    const app = JSON.parse(fs.readFileSync('./app.json', 'utf8'));
    app.expo.version = '$VERSION';
    fs.writeFileSync('./app.json', JSON.stringify(app, null, 2) + '\n');
  "
  node -e "
    const fs = require('fs');
    const pkg = JSON.parse(fs.readFileSync('./package.json', 'utf8'));
    pkg.version = '$VERSION';
    fs.writeFileSync('./package.json', JSON.stringify(pkg, null, 2) + '\n');
  "
fi

# ── Ensure ANDROID_HOME ──────────────────────────────────────
export ANDROID_HOME="${ANDROID_HOME:-/opt/android-sdk}"
export ANDROID_SDK_ROOT="$ANDROID_HOME"
if [ ! -d "$ANDROID_HOME/platforms" ]; then
  echo "ERROR: ANDROID_HOME ($ANDROID_HOME) does not contain platforms/"
  echo "Set ANDROID_HOME to your Android SDK path."
  exit 1
fi

# ── Ensure JAVA_HOME ─────────────────────────────────────────
if [ -z "${JAVA_HOME:-}" ]; then
  if [ -d "/usr/lib/jvm/java-21-openjdk-amd64" ]; then
    export JAVA_HOME="/usr/lib/jvm/java-21-openjdk-amd64"
  elif [ -d "/usr/lib/jvm/java-17-openjdk-amd64" ]; then
    export JAVA_HOME="/usr/lib/jvm/java-17-openjdk-amd64"
  fi
fi

# ── Step 1: Always clean prebuild to pick up app.json changes ─
echo "Generating native Android project (clean)..."
npx expo prebuild --platform android --clean

# ── Step 2: Ensure local.properties ──────────────────────────
if [ ! -f "android/local.properties" ]; then
  echo "sdk.dir=$ANDROID_HOME" > android/local.properties
fi

# ── Step 3: Bundle JS ────────────────────────────────────────
echo "Bundling JavaScript..."
mkdir -p android/app/src/main/assets
npx expo export --platform android

# Copy the Hermes bytecode bundle
BUNDLE=$(ls -1 dist/_expo/static/js/android/entry-*.hbc 2>/dev/null | head -1)
if [ -z "$BUNDLE" ]; then
  echo "ERROR: JS bundle not found in dist/"
  exit 1
fi
cp "$BUNDLE" android/app/src/main/assets/index.android.bundle
echo "JS bundle: $(du -h android/app/src/main/assets/index.android.bundle | cut -f1)"

# ── Step 4: Gradle build (arm64 only) ────────────────────────
echo "Building APK with Gradle..."
cd android
./gradlew assembleRelease --no-daemon -PreactNativeArchitectures=arm64-v8a -q
cd ..

# ── Step 5: Copy output ──────────────────────────────────────
APK_SRC="android/app/build/outputs/apk/release/app-release.apk"
APK_DST="velum-v${VERSION}-arm64.apk"

if [ ! -f "$APK_SRC" ]; then
  echo "ERROR: APK not found at $APK_SRC"
  exit 1
fi

cp "$APK_SRC" "$APK_DST"
APK_SIZE=$(du -h "$APK_DST" | cut -f1)

echo ""
echo "BUILD SUCCESSFUL"
echo "  APK: $APK_DST ($APK_SIZE)"
echo "  Version: $VERSION"
echo "  Arch: arm64-v8a"

# ── Step 6: Create GitHub Release (if gh CLI available) ──────
if command -v gh &>/dev/null; then
  echo ""
  echo "Publishing GitHub Release..."

  TAG="v${VERSION}"

  # Check if release already exists
  if gh release view "$TAG" &>/dev/null 2>&1; then
    echo "Release $TAG already exists — uploading APK asset..."
    gh release upload "$TAG" "$APK_DST" --clobber
  else
    gh release create "$TAG" "$APK_DST" \
      --title "Velum Mobile $TAG" \
      --notes "Velum Mobile v${VERSION}

## What's new
- Auto-update system: checks GitHub Releases for new versions
- In-app APK download with progress bar
- One-tap install after download
- Background update checks with 6-hour cooldown

## Install
Download \`${APK_DST}\` and install on your Android device.
" \
      --latest

    echo "GitHub Release $TAG published!"
  fi
  echo "  URL: https://github.com/MehighCB3/Velum/releases/tag/$TAG"
else
  echo ""
  echo "Next steps (gh CLI not found — publish manually):"
  echo "  1. git add $APK_DST && git commit && git push"
  echo "  2. Create a GitHub Release tagged v$VERSION"
  echo "  3. Upload $APK_DST as a release asset"
  echo "  4. The app will auto-detect the new version on next check"
fi
