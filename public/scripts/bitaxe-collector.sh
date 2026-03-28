#!/bin/bash
# bitaxe-collector.sh
# Requires: curl, jq
# Run every minute: * * * * * /path/to/bitaxe-collector.sh

API_KEY="${NUMBRS_API_KEY:-YOUR_KEY}"
BITAXE_IP="${BITAXE_IP:-192.168.1.100}"   # Change to your Bitaxe's local IP
INGEST_URL="${NUMBRS_INGEST:-https://numbrs.lol/api/ingest}"

data=$(curl -sf "http://${BITAXE_IP}/api/system/info") || exit 1

hashrate=$(echo "$data"  | jq -r '.hashRate // 0')
temp=$(echo "$data"      | jq -r '.temp // 0')
power=$(echo "$data"     | jq -r '.power // 0')
best_diff=$(echo "$data" | jq -r '.bestDiff // 0')
shares=$(echo "$data"    | jq -r '.sharesAccepted // 0')
rejected=$(echo "$data"  | jq -r '.sharesRejected // 0')

curl -sf -X POST "$INGEST_URL" \
  -H "Content-Type: application/json" \
  -H "X-API-KEY: $API_KEY" \
  -d "[
    {\"key\": \"bitaxe.hashrate_ghs\", \"value\": $hashrate},
    {\"key\": \"bitaxe.temp_c\",       \"value\": $temp},
    {\"key\": \"bitaxe.power_w\",      \"value\": $power},
    {\"key\": \"bitaxe.best_diff\",    \"value\": $best_diff},
    {\"key\": \"bitaxe.shares_accepted\", \"value\": $shares},
    {\"key\": \"bitaxe.shares_rejected\", \"value\": $rejected}
  ]"
