import { NextResponse } from 'next/server';

// Current app version — bump this when publishing new APK builds
const CURRENT_VERSION = '1.0.1';
const APK_DOWNLOAD_URL =
  'https://github.com/MehighCB3/Velum/raw/main/velum-mobile/velum-v1.0.0-arm64.apk';

export async function GET() {
  return NextResponse.json({
    version: CURRENT_VERSION,
    apkUrl: APK_DOWNLOAD_URL,
    releaseNotes: 'New branding, Spanish card fixes, park feature',
  });
}
