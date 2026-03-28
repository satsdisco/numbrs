#!/bin/bash
# claude-collector.sh — Push Claude Code usage to numbrs
# Run hourly: 0 * * * * bash /path/to/claude-collector.sh
# Or after each session: add to your shell profile
#
# Reads Claude Code usage logs from ~/.claude/usage/ and pushes
# session data to your numbrs account. Data appears on the /claude page.
#
# Required: curl, jq, a numbrs API key
# Usage data location: ~/.claude/usage/YYYY-MM-DD.json

API_KEY="${NUMBRS_API_KEY:-YOUR_KEY}"
API_URL="https://numbrs.lol/api/claude-usage"
USAGE_DIR="$HOME/.claude/usage"
STATE_FILE="$HOME/.claude/.numbrs-sync-state"

TODAY=$(date +%Y-%m-%d)
USAGE_FILE="$USAGE_DIR/$TODAY.json"

[ -f "$USAGE_FILE" ] || exit 0

# Track what we've already synced to avoid duplicate pushes
LAST_SYNCED_SIZE=0
if [ -f "$STATE_FILE" ]; then
  STORED_DATE=$(jq -r '.date // ""' "$STATE_FILE" 2>/dev/null)
  if [ "$STORED_DATE" = "$TODAY" ]; then
    LAST_SYNCED_SIZE=$(jq -r '.size // 0' "$STATE_FILE" 2>/dev/null)
  fi
fi

CURRENT_SIZE=$(wc -c < "$USAGE_FILE" | tr -d ' ')
if [ "$CURRENT_SIZE" -le "$LAST_SYNCED_SIZE" ]; then
  exit 0  # No new data since last sync
fi

# Build the payload — one row per session
# Claude Code stores usage as a JSON array of session objects
PAYLOAD=$(jq -c "[.[] | {
  date: \"$TODAY\",
  session_id: .session_id,
  project: (.project // \"unknown\"),
  messages: (.messages // 0),
  tool_calls: (.tool_calls // 0),
  input_tokens: (.input_tokens // 0),
  output_tokens: (.output_tokens // 0),
  cache_read_tokens: (.cache_read_tokens // 0),
  cache_write_tokens: (.cache_write_tokens // 0),
  model: (.model // \"unknown\")
}]" "$USAGE_FILE" 2>/dev/null)

if [ -z "$PAYLOAD" ] || [ "$PAYLOAD" = "[]" ]; then
  exit 0
fi

# Push to numbrs — upserts by session_id so re-runs are safe
RESPONSE=$(curl -sf -w "%{http_code}" -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -H "X-API-KEY: $API_KEY" \
  -d "$PAYLOAD")

HTTP_CODE="${RESPONSE: -3}"
if [ "$HTTP_CODE" = "201" ] || [ "$HTTP_CODE" = "200" ]; then
  # Update sync state on success
  mkdir -p "$(dirname "$STATE_FILE")"
  echo "{\"date\": \"$TODAY\", \"size\": $CURRENT_SIZE}" > "$STATE_FILE"
fi
