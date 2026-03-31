#!/usr/bin/env bash
# kuma-sync.sh — Scrapes Uptime Kuma /metrics and syncs to Supabase
#
# Crontab (runs every minute):
#   * * * * * /path/to/scripts/kuma-sync.sh >> /tmp/kuma-sync.log 2>&1
#
# Dependencies: curl, python3 (stdlib only)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=.env
source "$SCRIPT_DIR/.env"

KUMA_METRICS_URL="http://localhost:3001/metrics"
KUMA_API_KEY="${KUMA_API_KEY}"

SUPABASE_URL="${NUMBRS_SUPABASE_URL}"
SUPABASE_KEY="${NUMBRS_SUPABASE_SERVICE_KEY}"

export KUMA_METRICS_URL KUMA_API_KEY SUPABASE_URL SUPABASE_KEY

echo "[kuma-sync] $(date -u +%Y-%m-%dT%H:%M:%SZ)"

python3 << 'PYEOF'
import os, re, json, base64, sys
import urllib.request, urllib.error
from datetime import datetime, timezone

KUMA_URL  = os.environ["KUMA_METRICS_URL"]
API_KEY   = os.environ["KUMA_API_KEY"]
SUPA_URL  = os.environ["SUPABASE_URL"]
SUPA_KEY  = os.environ["SUPABASE_KEY"]

# ── Fetch Prometheus metrics ──────────────────────────────────────────────────

auth_header = "Basic " + base64.b64encode(f":{API_KEY}".encode()).decode()
req = urllib.request.Request(KUMA_URL, headers={"Authorization": auth_header})
try:
    with urllib.request.urlopen(req, timeout=15) as resp:
        content = resp.read().decode("utf-8")
except Exception as exc:
    print(f"[kuma-sync] ERROR fetching metrics: {exc}", file=sys.stderr)
    sys.exit(1)

# ── Parse Prometheus text format ─────────────────────────────────────────────

def parse_labels(s):
    return {m.group(1): m.group(2) for m in re.finditer(r'(\w+)="([^"]*)"', s)}

monitors = {}
for line in content.splitlines():
    if line.startswith("#") or not line.strip():
        continue
    m = re.match(r'^(\w+)\{([^}]*)\}\s+(\S+)$', line)
    if not m:
        continue
    metric, label_str, raw_val = m.group(1), m.group(2), m.group(3)
    try:
        value = float(raw_val)
    except ValueError:
        continue
    labels = parse_labels(label_str)
    name = labels.get("monitor_name", "")
    if not name:
        continue
    if name not in monitors:
        monitors[name] = {
            "name":               name,
            "monitor_type":       labels.get("monitor_type") or None,
            "url":                labels.get("monitor_url")  or None,
            "hostname":           labels.get("monitor_hostname") or None,
            "port":               labels.get("monitor_port") or None,
            "status":             2,    # PENDING until monitor_status parsed
            "response_time_ms":   None,
            "cert_days_remaining": None,
            "cert_is_valid":      None,
        }
    if metric == "monitor_status":
        monitors[name]["status"] = int(value)
    elif metric == "monitor_response_time":
        monitors[name]["response_time_ms"] = value if value >= 0 else None
    elif metric == "monitor_cert_days_remaining":
        monitors[name]["cert_days_remaining"] = int(value) if value >= 0 else None
    elif metric == "monitor_cert_is_valid":
        monitors[name]["cert_is_valid"] = bool(int(value))

monitor_rows = list(monitors.values())
print(f"[kuma-sync] Parsed {len(monitor_rows)} monitors")

if not monitor_rows:
    print("[kuma-sync] No monitors found in metrics — check Kuma is running", file=sys.stderr)
    sys.exit(1)

# Stamp last_updated on each monitor row
now_iso = datetime.now(timezone.utc).isoformat()
for row in monitor_rows:
    row["last_updated"] = now_iso

# ── Supabase REST helper ──────────────────────────────────────────────────────

def supabase_post(table, rows, prefer=None):
    url  = f"{SUPA_URL}/rest/v1/{table}"
    body = json.dumps(rows).encode()
    headers = {
        "apikey":        SUPA_KEY,
        "Authorization": f"Bearer {SUPA_KEY}",
        "Content-Type":  "application/json",
    }
    if prefer:
        headers["Prefer"] = prefer
    req = urllib.request.Request(url, data=body, headers=headers, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            return resp.status
    except urllib.error.HTTPError as exc:
        err_body = exc.read().decode()[:300]
        print(f"[kuma-sync] HTTP {exc.code} on {table}: {err_body}", file=sys.stderr)
        return exc.code

# ── Upsert kuma_monitors (merge on primary key = name) ───────────────────────

status = supabase_post(
    "kuma_monitors",
    monitor_rows,
    prefer="resolution=merge-duplicates",
)
print(f"[kuma-sync] kuma_monitors upsert → HTTP {status}")

# ── Insert kuma_heartbeats ────────────────────────────────────────────────────

heartbeat_rows = [
    {
        "monitor_name":    r["name"],
        "status":          r["status"],
        "response_time_ms": r["response_time_ms"],
        "checked_at":      now_iso,
    }
    for r in monitor_rows
]
status = supabase_post("kuma_heartbeats", heartbeat_rows)
print(f"[kuma-sync] kuma_heartbeats insert  → HTTP {status} ({len(heartbeat_rows)} rows)")
PYEOF
