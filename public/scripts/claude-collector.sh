#!/bin/bash
# claude-collector.sh — Push Claude Code usage to numbrs
# Run hourly: 0 * * * * bash /path/to/claude-collector.sh
# Or after each session: add to your shell profile
#
# Reads Claude Code usage logs from ~/.claude/usage/ and pushes
# token counts and cost to your numbrs account via the standard API.
#
# Required: curl, jq, a numbrs API key
# Usage data location: ~/.claude/usage/YYYY-MM-DD.json

API_KEY="${NUMBRS_API_KEY:-YOUR_KEY}"
INGEST_URL="https://numbrs.lol/api/ingest"
USAGE_DIR="$HOME/.claude/usage"
STATE_FILE="$HOME/.claude/.numbrs-sync-state"

TODAY=$(date +%Y-%m-%d)
USAGE_FILE="$USAGE_DIR/$TODAY.json"

[ -f "$USAGE_FILE" ] || exit 0

# Track what we've already synced to avoid duplicates
LAST_SYNCED_SIZE=0
if [ -f "$STATE_FILE" ]; then
  STORED_DATE=$(jq -r '.date // ""' "$STATE_FILE" 2>/dev/null)
  if [ "$STORED_DATE" = "$TODAY" ]; then
    LAST_SYNCED_SIZE=$(jq -r '.size // 0' "$STATE_FILE" 2>/dev/null)
  fi
fi

CURRENT_SIZE=$(wc -c < "$USAGE_FILE" | tr -d ' ')
if [ "$CURRENT_SIZE" -le "$LAST_SYNCED_SIZE" ]; then
  exit 0  # No new data
fi

# Parse the usage file and aggregate today's totals
TOTAL_INPUT=$(jq '[.[].input_tokens // 0] | add // 0' "$USAGE_FILE")
TOTAL_OUTPUT=$(jq '[.[].output_tokens // 0] | add // 0' "$USAGE_FILE")
TOTAL_CACHE_READ=$(jq '[.[].cache_read_tokens // 0] | add // 0' "$USAGE_FILE")
TOTAL_CACHE_WRITE=$(jq '[.[].cache_write_tokens // 0] | add // 0' "$USAGE_FILE")
SESSION_COUNT=$(jq 'length' "$USAGE_FILE")
TOTAL_COST=$(jq '[.[].cost_usd // 0] | add // 0' "$USAGE_FILE" 2>/dev/null || echo 0)

# Calculate total tokens
TOTAL_TOKENS=$((TOTAL_INPUT + TOTAL_OUTPUT))

# Push aggregated metrics
curl -sf -X POST "$INGEST_URL" \
  -H "Content-Type: application/json" \
  -H "X-API-KEY: $API_KEY" \
  -d "[
    {\"key\": \"claude.input_tokens\",      \"value\": $TOTAL_INPUT},
    {\"key\": \"claude.output_tokens\",     \"value\": $TOTAL_OUTPUT},
    {\"key\": \"claude.total_tokens\",      \"value\": $TOTAL_TOKENS},
    {\"key\": \"claude.cache_read_tokens\", \"value\": $TOTAL_CACHE_READ},
    {\"key\": \"claude.cache_write_tokens\",\"value\": $TOTAL_CACHE_WRITE},
    {\"key\": \"claude.sessions\",          \"value\": $SESSION_COUNT},
    {\"key\": \"claude.cost_usd\",          \"value\": $TOTAL_COST}
  ]"

# Update sync state
mkdir -p "$(dirname "$STATE_FILE")"
echo "{\"date\": \"$TODAY\", \"size\": $CURRENT_SIZE}" > "$STATE_FILE"
