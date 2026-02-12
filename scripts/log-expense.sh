#!/bin/bash
# Log a budget expense to the Velum API
# Usage: bash log-expense.sh "Groceries at Mercadona" 23.50 "Food" "18:45"
# Args: item amount category time
#
# Categories: Food, Fun, Transport, Subscriptions, Other

VELUM_URL="${VELUM_URL:-https://velum-five.vercel.app}"

ITEM="$1"
AMOUNT="$2"
CATEGORY="$3"
TIME="$4"

if [ -z "$ITEM" ] || [ -z "$AMOUNT" ]; then
  echo "Usage: bash log-expense.sh <item> <amount> [category] [time]"
  echo "Categories: Food, Fun, Transport, Subscriptions, Other"
  exit 1
fi

DATE=$(date +%Y-%m-%d)
ID=$(cat /proc/sys/kernel/random/uuid 2>/dev/null || python3 -c "import uuid; print(uuid.uuid4())" 2>/dev/null || echo "$(date +%s)-$$")
CATEGORY="${CATEGORY:-Other}"
TIMESTAMP="${DATE}T${TIME:-$(date +%H:%M)}:00Z"

BODY=$(cat <<EOF
{
  "entry": {
    "id": "$ID",
    "amount": $AMOUNT,
    "category": "$CATEGORY",
    "description": "$ITEM",
    "date": "$DATE",
    "timestamp": "$TIMESTAMP"
  }
}
EOF
)

echo "Logging expense: €$AMOUNT $ITEM ($CATEGORY) on $DATE..."
response=$(curl -s -w "\n%{http_code}" -X POST "$VELUM_URL/api/budget" \
  -H "Content-Type: application/json" \
  -d "$BODY")

http_code=$(echo "$response" | tail -1)
body=$(echo "$response" | head -n -1)

if [ "$http_code" = "200" ]; then
  echo "OK: €$AMOUNT $ITEM logged successfully"
  # Show remaining budget
  remaining=$(echo "$body" | python3 -c "import sys,json; d=json.load(sys.stdin); print(f'Remaining: €{d.get(\"remaining\", \"?\")}')" 2>/dev/null)
  [ -n "$remaining" ] && echo "$remaining"
else
  echo "FAILED ($http_code): $body"
  exit 1
fi
