#!/bin/bash
# system-collector.sh
# Supports: Linux (uses /proc) and macOS (uses sysctl/vm_stat)
# Run every minute: * * * * * /path/to/system-collector.sh

API_KEY="${NUMBRS_API_KEY:-YOUR_KEY}"
INGEST_URL="${NUMBRS_INGEST:-https://numbrs.lol/api/ingest}"

if [[ "$(uname)" == "Darwin" ]]; then
  # macOS
  cpu=$(top -l 1 -s 0 | awk '/CPU usage/ {gsub(/%/,""); print $3+$5}')
  ram_total_pages=$(sysctl -n hw.memsize | awk '{print $1/4096}')
  vm=$(vm_stat)
  pages_free=$(echo "$vm"      | awk '/Pages free/       {gsub(/\./,""); print $3}')
  pages_inactive=$(echo "$vm"  | awk '/Pages inactive/   {gsub(/\./,""); print $3}')
  ram_used_pages=$((ram_total_pages - pages_free - pages_inactive))
  ram_pct=$((ram_used_pages * 100 / ram_total_pages))
  ram_used_mb=$((ram_used_pages * 4 / 1024))
  disk_pct=$(df / | awk 'NR==2 {gsub(/%/,""); print $5}')
  disk_free_gb=$(df / | awk 'NR==2 {printf "%.1f", $4/1024/1024}')
else
  # Linux
  cpu=$(top -bn1 | grep "Cpu(s)" | awk '{print $2+$4}' | cut -d. -f1)
  ram_info=$(free -m)
  ram_total=$(echo "$ram_info" | awk '/^Mem:/ {print $2}')
  ram_used=$(echo "$ram_info"  | awk '/^Mem:/ {print $3}')
  ram_pct=$((ram_used * 100 / ram_total))
  ram_used_mb=$ram_used
  disk_pct=$(df / | awk 'NR==2 {gsub(/%/,""); print $5}')
  disk_free_gb=$(df / | awk 'NR==2 {printf "%.1f", $4/1024/1024}')
fi

curl -sf -X POST "$INGEST_URL" \
  -H "Content-Type: application/json" \
  -H "X-API-KEY: $API_KEY" \
  -d "[
    {\"key\": \"system.cpu_pct\",              \"value\": ${cpu:-0}},
    {\"key\": \"system.ram_pct\",              \"value\": ${ram_pct:-0}},
    {\"key\": \"system.ram_used_mb\",          \"value\": ${ram_used_mb:-0}},
    {\"key\": \"system.disk_boot_pct\",        \"value\": ${disk_pct:-0}},
    {\"key\": \"system.disk_external_free_gb\",\"value\": ${disk_free_gb:-0}}
  ]"
