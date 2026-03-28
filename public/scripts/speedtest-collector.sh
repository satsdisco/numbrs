#!/bin/bash
# speedtest-collector.sh — Internet speed test metrics → numbrs
# Run every 30 min via cron: */30 * * * * bash /path/to/scripts/speedtest-collector.sh
#
# Required environment variables:
#   NUMBRS_API_KEY, NUMBRS_INGEST
#
# Usage: source scripts/.env && bash scripts/speedtest-collector.sh

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

# Find speedtest binary (Ookla preferred, speedtest-cli fallback)
if command -v speedtest &>/dev/null; then
  SPEEDTEST_BIN="speedtest"
  SPEEDTEST_TYPE="ookla"
elif command -v speedtest-cli &>/dev/null; then
  SPEEDTEST_BIN="speedtest-cli"
  SPEEDTEST_TYPE="python"
else
  echo "ERROR: No speedtest CLI found. Install one of:" >&2
  echo "  brew install speedtest-cli   # macOS (Ookla)" >&2
  echo "  pip install speedtest-cli    # Python fallback" >&2
  echo "  apt install speedtest-cli    # Debian/Ubuntu" >&2
  exit 1
fi

echo "Running speedtest (this may take 30-60 seconds)…"

if [[ "$SPEEDTEST_TYPE" == "ookla" ]]; then
  # Ookla speedtest — JSON output, bandwidth in bytes/s
  RAW=$("$SPEEDTEST_BIN" --format=json 2>/dev/null)
  if [[ -z "$RAW" ]]; then
    echo "ERROR: speedtest returned no output" >&2
    exit 1
  fi
  DOWNLOAD=$(echo "$RAW" | python3 -c "
import sys, json
d = json.load(sys.stdin)
print(round(d['download']['bandwidth'] * 8 / 1e6, 2))
" 2>/dev/null)
  UPLOAD=$(echo "$RAW" | python3 -c "
import sys, json
d = json.load(sys.stdin)
print(round(d['upload']['bandwidth'] * 8 / 1e6, 2))
" 2>/dev/null)
  PING=$(echo "$RAW" | python3 -c "
import sys, json
d = json.load(sys.stdin)
print(round(d['ping']['latency'], 2))
" 2>/dev/null)
  JITTER=$(echo "$RAW" | python3 -c "
import sys, json
d = json.load(sys.stdin)
print(round(d['ping']['jitter'], 2))
" 2>/dev/null)
else
  # speedtest-cli (Python) — JSON output, speeds in bits/s
  RAW=$("$SPEEDTEST_BIN" --json 2>/dev/null)
  if [[ -z "$RAW" ]]; then
    echo "ERROR: speedtest-cli returned no output" >&2
    exit 1
  fi
  DOWNLOAD=$(echo "$RAW" | python3 -c "
import sys, json
d = json.load(sys.stdin)
print(round(d['download'] / 1e6, 2))
" 2>/dev/null)
  UPLOAD=$(echo "$RAW" | python3 -c "
import sys, json
d = json.load(sys.stdin)
print(round(d['upload'] / 1e6, 2))
" 2>/dev/null)
  PING=$(echo "$RAW" | python3 -c "
import sys, json
d = json.load(sys.stdin)
print(round(d['ping'], 2))
" 2>/dev/null)
  JITTER="0"
fi

[[ -z "$DOWNLOAD" ]] && { echo "ERROR: Failed to parse download speed" >&2; exit 1; }
[[ -z "$UPLOAD" ]]   && { echo "ERROR: Failed to parse upload speed" >&2; exit 1; }
[[ -z "$PING" ]]     && { echo "ERROR: Failed to parse ping" >&2; exit 1; }
[[ -z "$JITTER" ]]   && JITTER="0"

push "speedtest.download_mbps" "$DOWNLOAD" "Download Speed" "Mbps"
push "speedtest.upload_mbps"   "$UPLOAD"   "Upload Speed"   "Mbps"
push "speedtest.ping_ms"       "$PING"     "Ping"           "ms"
push "speedtest.jitter_ms"     "$JITTER"   "Jitter"         "ms"

echo "Speedtest done: ↓${DOWNLOAD} Mbps ↑${UPLOAD} Mbps ping ${PING}ms jitter ${JITTER}ms"
