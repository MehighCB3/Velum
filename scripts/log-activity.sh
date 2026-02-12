#!/bin/bash
# Log a fitness activity to the Velum API
# Usage: bash log-activity.sh "Running" 45 6.5 420 "Easy pace" "07:30"
# Args: activity duration_min distance_km calories notes time
#
# Activity types: Running, Swimming, Cycling, BJJ, Steps, Gym, Other

VELUM_URL="${VELUM_URL:-https://velum-five.vercel.app}"

ACTIVITY="$1"
DURATION="$2"
DISTANCE="$3"
CALORIES="$4"
NOTES="$5"
TIME="$6"

if [ -z "$ACTIVITY" ]; then
  echo "Usage: bash log-activity.sh <activity> [duration_min] [distance_km] [calories] [notes] [time]"
  echo "Activity types: Running, Swimming, Cycling, BJJ, Steps, Gym, Other"
  exit 1
fi

DATE=$(date +%Y-%m-%d)
ID=$(cat /proc/sys/kernel/random/uuid 2>/dev/null || python3 -c "import uuid; print(uuid.uuid4())" 2>/dev/null || echo "$(date +%s)-$$")

# Map friendly names to API types
case "$(echo "$ACTIVITY" | tr '[:upper:]' '[:lower:]')" in
  running|run)   TYPE="run" ;;
  swimming|swim) TYPE="swim" ;;
  cycling|cycle) TYPE="cycle" ;;
  bjj|jiujitsu)  TYPE="jiujitsu" ;;
  steps)         TYPE="steps" ;;
  gym)           TYPE="gym" ;;
  *)             TYPE="other" ;;
esac

# Build the entry JSON
if [ "$TYPE" = "steps" ]; then
  # For steps, duration field is actually step count
  ENTRY=$(cat <<EOF
{
  "id": "$ID",
  "type": "$TYPE",
  "date": "$DATE",
  "steps": ${DURATION:-0},
  "notes": "${NOTES:-}",
  "name": "${NOTES:-Steps}"
}
EOF
)
else
  ENTRY=$(cat <<EOF
{
  "id": "$ID",
  "type": "$TYPE",
  "date": "$DATE",
  "duration": ${DURATION:-0},
  "distance": ${DISTANCE:-0},
  "calories": ${CALORIES:-0},
  "notes": "${NOTES:-}",
  "name": "$ACTIVITY"
}
EOF
)
fi

BODY=$(cat <<EOF
{
  "entry": $ENTRY
}
EOF
)

echo "Logging $ACTIVITY ($TYPE) on $DATE..."
response=$(curl -s -w "\n%{http_code}" -X POST "$VELUM_URL/api/fitness" \
  -H "Content-Type: application/json" \
  -d "$BODY")

http_code=$(echo "$response" | tail -1)
body=$(echo "$response" | head -n -1)

if [ "$http_code" = "200" ]; then
  echo "OK: $ACTIVITY logged successfully"
  echo "$body" | python3 -m json.tool 2>/dev/null || echo "$body"
else
  echo "FAILED ($http_code): $body"
  exit 1
fi
