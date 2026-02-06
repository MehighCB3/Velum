#!/bin/bash
# Push agent insights from Pi to Velum dashboard
# Usage: Run via cron on Raspberry Pi
# Reads JSON files from ~/clawd/insights/ and POSTs to Velum API

VELUM_URL="https://velum-five.vercel.app/api/insights"
API_KEY="${INSIGHTS_API_KEY:-your-key-here}"

for file in ~/clawd/insights/*.json; do
  [ -f "$file" ] || continue
  echo "Pushing: $file"
  response=$(curl -s -w "\n%{http_code}" -X POST "$VELUM_URL" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $API_KEY" \
    -d @"$file")

  http_code=$(echo "$response" | tail -1)
  body=$(echo "$response" | head -n -1)

  if [ "$http_code" = "200" ]; then
    echo "  OK: $body"
  else
    echo "  FAILED ($http_code): $body"
  fi
done
