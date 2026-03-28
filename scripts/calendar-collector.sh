#!/bin/bash
# calendar-collector.sh — Google Calendar events → numbrs
# Run every 30 min via cron: */30 * * * * bash /path/to/scripts/calendar-collector.sh
#
# Requires: gog CLI (google calendar CLI, already installed)
#
# Required environment variables:
#   NUMBRS_API_KEY, NUMBRS_INGEST
#
# Usage: source scripts/.env && bash scripts/calendar-collector.sh

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [[ -f "$SCRIPT_DIR/.env" ]]; then
  set -a
  source "$SCRIPT_DIR/.env"
  set +a
fi

MISSING=()
[[ -z "${NUMBRS_API_KEY:-}" ]] && MISSING+=("NUMBRS_API_KEY")
[[ -z "${NUMBRS_INGEST:-}" ]]  && MISSING+=("NUMBRS_INGEST")

if [[ ${#MISSING[@]} -gt 0 ]]; then
  echo "ERROR: Missing required environment variables: ${MISSING[*]}" >&2
  echo "Copy scripts/.env.example to scripts/.env and fill in values." >&2
  exit 1
fi

if ! command -v gog &>/dev/null; then
  echo "ERROR: gog CLI not found. Make sure it is installed and on your PATH." >&2
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

# Portable date arithmetic: macOS uses -v, GNU uses -d
if date -v+1d +%Y-%m-%d &>/dev/null 2>&1; then
  TOMORROW=$(date -v+1d +%Y-%m-%d)
  DAY_AFTER=$(date -v+2d +%Y-%m-%d)
else
  TOMORROW=$(date -d tomorrow +%Y-%m-%d)
  DAY_AFTER=$(date -d '+2 days' +%Y-%m-%d)
fi
TODAY=$(date +%Y-%m-%d)

# ── Events today ──────────────────────────────────────────────────────────────

TODAY_RAW=$(gog calendar list --from "$TODAY" --to "$TOMORROW" --json 2>/dev/null)
EVENTS_TODAY=$(echo "$TODAY_RAW" | python3 -c "
import sys, json
try:
    d = json.load(sys.stdin)
    print(len(d) if isinstance(d, list) else 0)
except:
    print(0)
" 2>/dev/null || echo "0")

push "calendar.events_today" "$EVENTS_TODAY" "Events Today" "events"

# ── Events tomorrow ───────────────────────────────────────────────────────────

TOMORROW_RAW=$(gog calendar list --from "$TOMORROW" --to "$DAY_AFTER" --json 2>/dev/null)
EVENTS_TOMORROW=$(echo "$TOMORROW_RAW" | python3 -c "
import sys, json
try:
    d = json.load(sys.stdin)
    print(len(d) if isinstance(d, list) else 0)
except:
    print(0)
" 2>/dev/null || echo "0")

push "calendar.events_tomorrow" "$EVENTS_TOMORROW" "Events Tomorrow" "events"

# ── Hours until next event ────────────────────────────────────────────────────

NEXT_EVENT_HOURS=$(echo "$TODAY_RAW" | python3 -c "
import sys, json
from datetime import datetime, timezone

try:
    events = json.load(sys.stdin)
    if not isinstance(events, list) or not events:
        print(0)
        sys.exit()
    now = datetime.now(timezone.utc)
    future_times = []
    for e in events:
        start = e.get('start', {}).get('dateTime') or e.get('start', {}).get('date')
        if not start:
            continue
        try:
            if 'T' in start:
                dt = datetime.fromisoformat(start.replace('Z', '+00:00'))
            else:
                dt = datetime.fromisoformat(start + 'T00:00:00+00:00')
            if dt > now:
                future_times.append(dt)
        except Exception:
            pass
    if future_times:
        delta = min(future_times) - now
        print(round(delta.total_seconds() / 3600, 1))
    else:
        print(0)
except Exception:
    print(0)
" 2>/dev/null || echo "0")

push "calendar.next_event_hours" "$NEXT_EVENT_HOURS" "Hours Until Next Event" "hours"

echo "Calendar done: today=${EVENTS_TODAY} tomorrow=${EVENTS_TOMORROW} next_in=${NEXT_EVENT_HOURS}h"
