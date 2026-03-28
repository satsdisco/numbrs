#!/bin/bash
# listenbrainz-collector.sh — ListenBrainz listening stats → numbrs
# Run every hour via cron: 0 * * * * bash /path/to/scripts/listenbrainz-collector.sh
#
# Required environment variables:
#   NUMBRS_API_KEY, NUMBRS_INGEST, LISTENBRAINZ_USER
#
# Optional:
#   LISTENBRAINZ_TOKEN  (not needed for public stats, but increases rate limits)
#
# Usage: source scripts/.env && bash scripts/listenbrainz-collector.sh

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [[ -f "$SCRIPT_DIR/.env" ]]; then
  set -a
  source "$SCRIPT_DIR/.env"
  set +a
fi

MISSING=()
[[ -z "${NUMBRS_API_KEY:-}" ]]    && MISSING+=("NUMBRS_API_KEY")
[[ -z "${NUMBRS_INGEST:-}" ]]     && MISSING+=("NUMBRS_INGEST")
[[ -z "${LISTENBRAINZ_USER:-}" ]] && MISSING+=("LISTENBRAINZ_USER")

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

LB_BASE="https://api.listenbrainz.org/1"
USER="${LISTENBRAINZ_USER}"

lb_get() {
  local url="$1"
  if [[ -n "${LISTENBRAINZ_TOKEN:-}" ]]; then
    curl -s -H "Authorization: Token ${LISTENBRAINZ_TOKEN}" "$url"
  else
    curl -s "$url"
  fi
}

# ── Total listen count ────────────────────────────────────────────────────────

LISTEN_COUNT_RAW=$(lb_get "${LB_BASE}/user/${USER}/listen-count")
TOTAL_LISTENS=$(echo "$LISTEN_COUNT_RAW" | python3 -c "
import sys, json
try:
    print(json.load(sys.stdin)['payload']['count'])
except Exception as e:
    print('', end='')
" 2>/dev/null)

if [[ -z "$TOTAL_LISTENS" ]]; then
  echo "ERROR: Failed to fetch listen count for user '${USER}'. Check LISTENBRAINZ_USER is correct." >&2
  exit 1
fi

push "listenbrainz.total_listens" "$TOTAL_LISTENS" "Total Listens" "listens"

# ── Weekly listening activity ─────────────────────────────────────────────────

ACTIVITY_RAW=$(lb_get "${LB_BASE}/stats/user/${USER}/listening-activity?range=this_week")

LISTENS_THIS_WEEK=$(echo "$ACTIVITY_RAW" | python3 -c "
import sys, json
try:
    d = json.load(sys.stdin)
    ranges = d.get('payload', {}).get('listening_activity', [])
    print(sum(r.get('listen_count', 0) for r in ranges))
except:
    print(0)
" 2>/dev/null)

[[ -z "$LISTENS_THIS_WEEK" ]] && LISTENS_THIS_WEEK="0"
push "listenbrainz.listens_this_week" "$LISTENS_THIS_WEEK" "Listens This Week" "listens"

# Today's listens — last entry in this_week activity range
LISTENS_TODAY=$(echo "$ACTIVITY_RAW" | python3 -c "
import sys, json
try:
    d = json.load(sys.stdin)
    ranges = d.get('payload', {}).get('listening_activity', [])
    print(ranges[-1].get('listen_count', 0) if ranges else 0)
except:
    print(0)
" 2>/dev/null)

[[ -z "$LISTENS_TODAY" ]] && LISTENS_TODAY="0"
push "listenbrainz.listens_today" "$LISTENS_TODAY" "Listens Today" "listens"

echo "ListenBrainz done: total=${TOTAL_LISTENS} this_week=${LISTENS_THIS_WEEK} today=${LISTENS_TODAY}"
