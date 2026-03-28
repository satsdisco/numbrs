#!/bin/bash
# pihole-collector.sh — Pi-hole DNS stats → numbrs
# Run every 15 min via cron: */15 * * * * bash /path/to/scripts/pihole-collector.sh
#
# Required environment variables:
#   NUMBRS_API_KEY, NUMBRS_INGEST, PIHOLE_HOST
#
# Optional:
#   PIHOLE_TOKEN  (required if auth is enabled on your Pi-hole)
#
# Usage: source scripts/.env && bash scripts/pihole-collector.sh

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [[ -f "$SCRIPT_DIR/.env" ]]; then
  set -a
  source "$SCRIPT_DIR/.env"
  set +a
fi

MISSING=()
[[ -z "${NUMBRS_API_KEY:-}" ]] && MISSING+=("NUMBRS_API_KEY")
[[ -z "${NUMBRS_INGEST:-}" ]]  && MISSING+=("NUMBRS_INGEST")
[[ -z "${PIHOLE_HOST:-}" ]]    && MISSING+=("PIHOLE_HOST")

if [[ ${#MISSING[@]} -gt 0 ]]; then
  echo "ERROR: Missing required environment variables: ${MISSING[*]}" >&2
  echo "Copy scripts/.env.example to scripts/.env and fill in values." >&2
  exit 1
fi

push() {
  local key="$1"
  local value="$2"
  local name="$3"
  local unit="${4:-}"
  curl -s -X POST "$NUMBRS_INGEST" \
    -H "x-api-key: $NUMBRS_API_KEY" \
    -H "Content-Type: application/json" \
    -d "{\"key\":\"$key\",\"value\":$value,\"name\":\"$name\",\"unit\":\"$unit\"}" > /dev/null
}

API_URL="http://${PIHOLE_HOST}/admin/api.php?summaryRaw"
[[ -n "${PIHOLE_TOKEN:-}" ]] && API_URL="${API_URL}&auth=${PIHOLE_TOKEN}"

RAW=$(curl -s --max-time 10 "$API_URL")

if [[ -z "$RAW" ]]; then
  echo "ERROR: Could not reach Pi-hole at ${PIHOLE_HOST}" >&2
  exit 1
fi

QUERIES_TODAY=$(echo "$RAW" | python3 -c "
import sys, json
try:
    print(json.load(sys.stdin)['dns_queries_today'])
except:
    print('', end='')
" 2>/dev/null)

if [[ -z "$QUERIES_TODAY" ]]; then
  echo "ERROR: Failed to parse Pi-hole API response (check PIHOLE_HOST and PIHOLE_TOKEN)" >&2
  echo "Response: ${RAW:0:200}" >&2
  exit 1
fi

BLOCKED_TODAY=$(echo "$RAW" | python3 -c "import sys,json; print(json.load(sys.stdin)['ads_blocked_today'])" 2>/dev/null || echo "0")
BLOCKED_PCT=$(echo "$RAW" | python3 -c "import sys,json; print(round(json.load(sys.stdin)['ads_percentage_today'], 2))" 2>/dev/null || echo "0")
BLOCKLIST=$(echo "$RAW" | python3 -c "import sys,json; print(json.load(sys.stdin)['domains_being_blocked'])" 2>/dev/null || echo "0")

push "pihole.queries_today"        "$QUERIES_TODAY" "Queries Today"        "queries"
push "pihole.blocked_today"        "$BLOCKED_TODAY" "Blocked Today"        "queries"
push "pihole.blocked_pct"          "$BLOCKED_PCT"   "Blocked Percentage"   "%"
push "pihole.domains_on_blocklist" "$BLOCKLIST"     "Domains on Blocklist" "domains"

echo "Pi-hole done: queries=${QUERIES_TODAY} blocked=${BLOCKED_TODAY} (${BLOCKED_PCT}%) blocklist=${BLOCKLIST}"
