#!/bin/bash
# Push agent insights from Pi to Velum dashboard
# Usage: Run via cron on Raspberry Pi
# Reads JSON files from ~/clawd/insights/ and POSTs to Velum API
#
# Required env var:
#   INSIGHTS_API_KEY  — Bearer token for Velum insights API
# Optional:
#   VELUM_URL         — Override base URL (default: https://velum-five.vercel.app)

set -euo pipefail

VELUM_BASE="${VELUM_URL:-https://velum-five.vercel.app}"
INSIGHTS_ENDPOINT="${VELUM_BASE}/api/insights"

if [ -z "${INSIGHTS_API_KEY:-}" ]; then
  echo "ERROR: INSIGHTS_API_KEY is not set. Export it before running this script."
  exit 1
fi

pushed=0
failed=0

for file in ~/clawd/insights/*.json; do
  [ -f "$file" ] || continue
  echo "Pushing: $file"
  response=$(curl -s -w "\n%{http_code}" -X POST "$INSIGHTS_ENDPOINT" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $INSIGHTS_API_KEY" \
    -d @"$file")

  http_code=$(echo "$response" | tail -1)
  body=$(echo "$response" | head -n -1)

  if [ "$http_code" = "200" ]; then
    echo "  OK: $body"
    pushed=$((pushed + 1))
  else
    echo "  FAILED ($http_code): $body"
    failed=$((failed + 1))
  fi
done

echo "Done: $pushed pushed, $failed failed"
