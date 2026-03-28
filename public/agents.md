# numbrs — Agent Setup Guide

numbrs is a personal infrastructure monitoring dashboard. This guide helps AI agents configure numbrs for users via the REST API.

## Base URL

```
https://numbrs.lol
```

## Authentication

All API calls require an `X-API-KEY` header.

Users create API keys at **https://numbrs.lol/api-keys** after signing in with Nostr or email.

```bash
# Test authentication
curl https://numbrs.lol/api/me \
  -H "X-API-KEY: YOUR_KEY"
```

## Full API Reference

OpenAPI 3.0 spec: **https://numbrs.lol/openapi.json**
Interactive docs: **https://numbrs.lol/docs/api**

---

## Quick Setup Flows

### Nostr Relay Monitoring

Monitor latency, uptime, and event throughput for Nostr relays.

**Step 1 — Add relays**

```bash
curl -X POST https://numbrs.lol/api/relays \
  -H "X-API-KEY: YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{"name": "nos.lol", "url": "wss://nos.lol"}'

curl -X POST https://numbrs.lol/api/relays \
  -H "X-API-KEY: YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{"name": "relay.damus.io", "url": "wss://relay.damus.io"}'
```

**Step 2 — Create relay health dashboard**

```bash
curl -X POST https://numbrs.lol/api/dashboards/from-template \
  -H "X-API-KEY: YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{"template": "relay-health"}'
```

**Step 3 — Add latency alert**

```bash
curl -X POST https://numbrs.lol/api/alerts \
  -H "X-API-KEY: YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "High Connect Latency",
    "metric": "relay_latency_connect_ms",
    "condition": "gt",
    "threshold": 1000
  }'
```

**Step 4 — Add uptime alert**

```bash
curl -X POST https://numbrs.lol/api/alerts \
  -H "X-API-KEY: YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Relay Down",
    "metric": "relay_up",
    "condition": "lt",
    "threshold": 1
  }'
```

Relay probe runs automatically every few minutes. Data appears within ~5 minutes of adding relays.

---

### Bitcoin Mining (Bitaxe)

Monitor hashrate, temperature, shares, and power for Bitaxe ASIC miners.

**Step 1 — Deploy the Bitaxe collector on your local network**

Save as `bitaxe-collector.sh` and run via cron every minute.

```bash
#!/bin/bash
# bitaxe-collector.sh
# Requires: curl, jq
# Run every minute: * * * * * /path/to/bitaxe-collector.sh

API_KEY="YOUR_KEY"
BITAXE_IP="192.168.1.100"   # Change to your Bitaxe's local IP
INGEST_URL="https://numbrs.lol/api/ingest"

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
```

**Step 2 — Create Bitaxe dashboard**

```bash
curl -X POST https://numbrs.lol/api/dashboards/from-template \
  -H "X-API-KEY: YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{"template": "bitaxe"}'
```

**Step 3 — Add hashrate drop alert**

```bash
curl -X POST https://numbrs.lol/api/alerts \
  -H "X-API-KEY: YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Hashrate Drop",
    "metric": "bitaxe.hashrate_ghs",
    "condition": "lt",
    "threshold": 400
  }'
```

---

### System Health Monitoring

Monitor CPU, RAM, disk, and network usage for any Linux/macOS server.

**Step 1 — Deploy the system health collector**

Save as `system-collector.sh` and run via cron every minute.

```bash
#!/bin/bash
# system-collector.sh
# Supports: Linux (uses /proc) and macOS (uses sysctl/vm_stat)
# Run every minute: * * * * * /path/to/system-collector.sh

API_KEY="YOUR_KEY"
INGEST_URL="https://numbrs.lol/api/ingest"

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
```

**Step 2 — Create system health dashboard**

```bash
curl -X POST https://numbrs.lol/api/dashboards/from-template \
  -H "X-API-KEY: YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{"template": "system-health"}'
```

**Step 3 — Add alerts**

```bash
# CPU alert
curl -X POST https://numbrs.lol/api/alerts \
  -H "X-API-KEY: YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{"name": "High CPU", "metric": "system.cpu_pct", "condition": "gt", "threshold": 90}'

# Disk full alert
curl -X POST https://numbrs.lol/api/alerts \
  -H "X-API-KEY: YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{"name": "Disk Full", "metric": "system.disk_boot_pct", "condition": "gt", "threshold": 85}'
```

---

### Media Server (Plex/Jellyfin)

Monitor active streams and library counts for Plex and Jellyfin.

**Step 1 — Configure Plex webhook**

In Plex Web → Settings → Webhooks, add:
```
https://numbrs.lol/functions/v1/plex-webhook
```
Include your API key as a query parameter or use the integration setup in **Settings → Integrations** in the numbrs UI.

**Step 2 — Create media dashboard**

```bash
curl -X POST https://numbrs.lol/api/dashboards/from-template \
  -H "X-API-KEY: YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{"template": "media"}'
```

**Step 3 — Add uptime monitor for Plex**

```bash
curl -X POST https://numbrs.lol/api/monitors \
  -H "X-API-KEY: YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{"name": "Plex", "url": "http://your-plex-ip:32400/web", "type": "http"}'
```

---

### GitHub Stats

GitHub repo metrics (stars, forks, open issues) are collected automatically by the server-side `collect-github` function. No collector script needed — just enable the integration in **Settings → Integrations** and specify which repos to track.

Metrics pushed: `github.{owner}.{repo}.stars`, `github.{owner}.{repo}.forks`, `github.{owner}.{repo}.issues`

**Create a GitHub project dashboard:**

```bash
curl -X POST https://numbrs.lol/api/dashboards/from-template \
  -H "X-API-KEY: YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{"template": "github-project"}'
```

Or for multiple repos side by side:

```bash
curl -X POST https://numbrs.lol/api/dashboards/from-template \
  -H "X-API-KEY: YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{"template": "github-projects"}'
```

---

### Bitcoin Price

BTC price is collected automatically by the server-side `collect-bitcoin` function every few minutes from Coinbase. No collector script needed — enable the integration in **Settings → Integrations**.

Metric pushed: `bitcoin.price_usd`

**Create a personal overview dashboard (includes BTC price):**

```bash
curl -X POST https://numbrs.lol/api/dashboards/from-template \
  -H "X-API-KEY: YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{"template": "personal-overview"}'
```

---

### Vercel Deploy Tracking

Vercel sends deploy events via webhook. Configure it in Vercel → Project → Settings → Webhooks.

Webhook URL:
```
https://numbrs.lol/api/ingest
```

Metrics pushed per deploy event: `deploy.count`, `build.duration_ms`, `error.count`

**Create a Vercel site dashboard:**

```bash
curl -X POST https://numbrs.lol/api/dashboards/from-template \
  -H "X-API-KEY: YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{"template": "vercel-site"}'
```

---

### Jellyfin Monitoring

Jellyfin metrics are pushed via the system health collector or a dedicated Jellyfin stats script. The `mac-mini-health` template includes Jellyfin panels.

Metrics: `jellyfin.active_streams`, `jellyfin.song_count`, `jellyfin.album_count`, `jellyfin.connected_clients`

```bash
curl -X POST https://numbrs.lol/api/dashboards/from-template \
  -H "X-API-KEY: YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{"template": "mac-mini-health"}'
```

---

### Self-Hosted Nostr Relay Stats (Haven / Khatru)

Push DB size and pubkey counts from your self-hosted relay to track growth over time.

Metrics: `relay.relay1.db_size_mb`, `relay.relay2.db_size_mb`, `relay.relay1.pubkeys`, etc.

```bash
# Example push for a Haven relay
DB_SIZE=$(du -sm /path/to/relay/db | awk '{print $1}')
PUBKEYS=$(sqlite3 /path/to/relay/db "SELECT COUNT(DISTINCT pubkey) FROM events")

curl -X POST https://numbrs.lol/api/ingest \
  -H "X-API-KEY: YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d "[
    {\"key\": \"relay.relay1.db_size_mb\", \"value\": $DB_SIZE},
    {\"key\": \"relay.relay1.pubkeys\",    \"value\": $PUBKEYS}
  ]"
```

**Create a Nostr relays dashboard:**

```bash
curl -X POST https://numbrs.lol/api/dashboards/from-template \
  -H "X-API-KEY: YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{"template": "nostr-relays"}'
```

---

### Uptime Monitoring

Add any HTTP or WebSocket endpoint to be checked automatically every minute by the server-side `uptime-check` function.

```bash
# HTTP endpoint
curl -X POST https://numbrs.lol/api/monitors \
  -H "X-API-KEY: YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{"name": "My API", "url": "https://api.example.com/health", "type": "http"}'

# WebSocket relay
curl -X POST https://numbrs.lol/api/monitors \
  -H "X-API-KEY: YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{"name": "My Relay", "url": "wss://relay.example.com", "type": "wss"}'
```

**Create an uptime overview dashboard:**

```bash
curl -X POST https://numbrs.lol/api/dashboards/from-template \
  -H "X-API-KEY: YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{"template": "uptime-overview"}'
```

---

### Claude / OpenClaw Usage Tracking

numbrs has a dedicated **Claude** page (`/claude`) that tracks your Claude API and Claude Code (OpenClaw) usage. Data is stored in two Supabase tables: `claude_usage` and `openclaw_usage`.

#### claude_usage table (Claude Code / API usage)

| Column | Type | Description |
|---|---|---|
| `date` | date | Day of usage (YYYY-MM-DD) |
| `session_id` | text | Unique session identifier |
| `project` | text | Project name |
| `messages` | integer | Message count in session |
| `tool_calls` | integer | Tool calls made |
| `input_tokens` | integer | Input token count |
| `output_tokens` | integer | Output token count |
| `cache_read_tokens` | integer | Cache-read token count |
| `cache_write_tokens` | integer | Cache-write token count |
| `model` | text | Model ID (e.g. `claude-sonnet-4-6`) |
| `created_at` | timestamptz | Row creation time |

#### openclaw_usage table (OpenClaw / multi-channel usage)

| Column | Type | Description |
|---|---|---|
| `date` | date | Day of usage (YYYY-MM-DD) |
| `session_id` | text | Unique session identifier |
| `channel` | text | Channel (`main`, `slack:*`, `discord:*`, etc.) |
| `model` | text | Model ID |
| `messages` | integer | Message count |
| `input_tokens` | integer | Input token count |
| `output_tokens` | integer | Output token count |
| `cache_read_tokens` | integer | Cache-read token count |
| `cache_write_tokens` | integer | Cache-write token count |
| `cost_usd` | numeric | Estimated API cost in USD |
| `created_at` | timestamptz | Row creation time |

#### Collector script — push Claude Code session data

The collector reads Claude Code usage (e.g. from `~/.claude/usage/`) and pushes rows directly to Supabase. This requires your Supabase service key or the project anon key with row-level security set up for your user.

```bash
#!/bin/bash
# claude-collector.sh
# Reads daily Claude Code usage and upserts into claude_usage via Supabase REST
# Run after each session or on a cron: 0 * * * * /path/to/claude-collector.sh

SUPABASE_URL="https://YOUR_PROJECT.supabase.co"
SUPABASE_KEY="YOUR_ANON_OR_SERVICE_KEY"
TABLE="claude_usage"

# Adjust path to where Claude Code stores usage logs
USAGE_FILE="$HOME/.claude/usage/$(date +%Y-%m-%d).json"
[ -f "$USAGE_FILE" ] || exit 0

# Parse and push each session row
jq -c '.[]' "$USAGE_FILE" | while read -r row; do
  curl -sf -X POST "$SUPABASE_URL/rest/v1/$TABLE" \
    -H "apikey: $SUPABASE_KEY" \
    -H "Authorization: Bearer $SUPABASE_KEY" \
    -H "Content-Type: application/json" \
    -H "Prefer: resolution=merge-duplicates" \
    -d "$row"
done
```

For OpenClaw (multi-channel Claude), the `openclaw_usage` table is populated automatically by the OpenClaw service — no collector script needed if you self-host OpenClaw pointed at the same Supabase project.

---

## Server-Side Integrations (No Collector Needed)

These collectors run automatically as Supabase Edge Functions and require no user-side setup beyond enabling the integration in **Settings → Integrations**:

| Function | What it does | Frequency |
|---|---|---|
| `relay-probe` | Probes all your Nostr relays via WebSocket — records connect latency, first-event latency, and uptime | Every ~5 min |
| `uptime-check` | HTTP/WSS checks for all your uptime monitors | Every ~1 min |
| `collect-github` | Fetches stars, forks, and open issues for configured repos | Periodic |
| `collect-bitcoin` | Fetches BTC price from Coinbase | Periodic |

---

## Available Dashboard Templates

All templates are created via `POST /api/dashboards/from-template` with `{"template": "<id>"}`.

### Nostr & Network

| Template ID | Name | Description | Key Metrics |
|---|---|---|---|
| `relay-health` | Relay Health | Relay status overview, latency charts, and uptime | `relay_latency_connect_ms`, `relay_latency_first_event_ms`, `relay_up` |
| `relay-overview` | Relay Overview | Connect latency, event latency, uptime per relay | `relay_latency_connect_ms`, `relay_latency_first_event_ms`, `relay_up` |
| `network-health` | Network Health | Network-wide throughput, active relays, and latency trends | `network_event_throughput`, `network_relay_count`, `network_avg_latency` |
| `zap-economy` | Zap Economy | Lightning zap volumes, counts, and averages over time | `zap_volume_sats`, `zap_count`, `zap_avg_size`, `zap_median_size` |
| `protocol-stats` | Protocol Analytics | Event kinds, propagation times, and NIP compatibility | `event_kind_1_count`, `event_kind_7_count`, `event_propagation_ms`, `nip_support_score` |
| `nostr-relays` | Nostr Relays | DB size and pubkey counts for self-hosted Haven/Khatru relays | `relay.relay1.db_size_mb`, `relay.relay1.pubkeys`, etc. |

### Infrastructure

| Template ID | Name | Description | Key Metrics |
|---|---|---|---|
| `system-health` | System Health | CPU, RAM, and disk usage for your server or desktop | `system.cpu_pct`, `system.ram_pct`, `system.disk_boot_pct`, `system.net_in_mbps` |
| `mac-mini-health` | Mac Mini Health | CPU, RAM, disk, and Jellyfin stats for a home server | `system.cpu_pct`, `system.ram_pct`, `system.disk_*`, `jellyfin.*` |
| `uptime-overview` | Uptime Overview | Uptime percentage, latency trends, and incident counts | `uptime.pct`, `uptime.latency_ms`, `uptime.incidents` |
| `bitaxe` | Bitaxe Miner | Hashrate, temperature, shares, best difficulty, and power | `bitaxe.hashrate_ghs`, `bitaxe.temp_c`, `bitaxe.power_w`, `bitaxe.best_diff` |

### Media

| Template ID | Name | Description | Key Metrics |
|---|---|---|---|
| `media` | Media Server | Plex and Jellyfin active streams and library stats | `plex.active_streams`, `plex.library.*`, `jellyfin.active_streams`, `jellyfin.song_count` |
| `plex-media-server` | Plex Media Server | Active streams and library counts for Plex | `plex.active_streams`, `plex.library.movies.count`, `plex.library.tv_shows.count` |

### Personal & Dev

| Template ID | Name | Description | Key Metrics |
|---|---|---|---|
| `github-project` | GitHub Project | Stars, forks, open issues, and PR velocity for a repo | `github.stars`, `github.open_issues`, `github.forks`, `github.prs_merged` |
| `github-projects` | GitHub Projects | Stars, issues, and forks across multiple repos | `github.user.repo1.stars`, `github.user.repo2.stars`, etc. |
| `vercel-site` | Vercel Site | Deploy counts, build durations, and error rates | `deploy.count`, `build.duration_ms`, `error.count` |
| `personal-overview` | Personal Overview | BTC price, Nostr followers, and GitHub stars | `bitcoin.price_usd`, `nostr.account1.followers`, `github.user.repo1.stars` |
| `personal-stats` | Personal Stats | Track anything — commits, workouts, sleep, habits | `dev.commits`, `dev.streak_days`, `habit.score`, `custom.metric_1` |

---

## Collector Scripts

### Install system-collector as a cron job

```bash
# Save the script
curl -o ~/system-collector.sh https://numbrs.lol/scripts/system-collector.sh
chmod +x ~/system-collector.sh

# Add API key
sed -i 's/YOUR_KEY/your-actual-api-key/' ~/system-collector.sh

# Run every minute
(crontab -l 2>/dev/null; echo "* * * * * $HOME/system-collector.sh") | crontab -
```

### Install bitaxe-collector as a cron job

```bash
# Save the script
curl -o ~/bitaxe-collector.sh https://numbrs.lol/scripts/bitaxe-collector.sh
chmod +x ~/bitaxe-collector.sh

# Set API key and Bitaxe IP
sed -i 's/YOUR_KEY/your-actual-api-key/' ~/bitaxe-collector.sh
sed -i 's/192.168.1.100/your-bitaxe-ip/'  ~/bitaxe-collector.sh

# Run every minute
(crontab -l 2>/dev/null; echo "* * * * * $HOME/bitaxe-collector.sh") | crontab -
```

---

## Example: Full Relay Monitoring Setup in One Go

Complete setup for monitoring two Nostr relays with alerts and a dashboard:

```bash
#!/bin/bash
KEY="your-api-key-here"
H="X-API-KEY: $KEY"
CT="Content-Type: application/json"
BASE="https://numbrs.lol/api"

echo "1/5 — Adding relays..."
curl -sf -X POST "$BASE/relays" -H "$H" -H "$CT" \
  -d '{"name":"nos.lol","url":"wss://nos.lol"}' | jq .id

curl -sf -X POST "$BASE/relays" -H "$H" -H "$CT" \
  -d '{"name":"relay.damus.io","url":"wss://relay.damus.io"}' | jq .id

echo "2/5 — Creating relay health dashboard..."
DASH=$(curl -sf -X POST "$BASE/dashboards/from-template" -H "$H" -H "$CT" \
  -d '{"template":"relay-health","name":"My Relay Dashboard"}')
echo "$DASH" | jq '{id: .id, panels: (.panels | length)}'

echo "3/5 — Adding latency alert..."
curl -sf -X POST "$BASE/alerts" -H "$H" -H "$CT" \
  -d '{"name":"High Latency","metric":"relay_latency_connect_ms","condition":"gt","threshold":1000}'

echo "4/5 — Adding uptime alert..."
curl -sf -X POST "$BASE/alerts" -H "$H" -H "$CT" \
  -d '{"name":"Relay Down","metric":"relay_up","condition":"lt","threshold":1}'

echo "5/5 — Checking account summary..."
curl -sf "$BASE/me" -H "$H" | jq .stats

echo "Done! Visit https://numbrs.lol/dashboards to see your new dashboard."
```

---

## Ingest Format Reference

The `/api/ingest` endpoint accepts single objects or arrays:

```bash
# Single metric
curl -X POST https://numbrs.lol/api/ingest \
  -H "X-API-KEY: YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{"key": "system.cpu_pct", "value": 42.5}'

# Batch with relay association
curl -X POST https://numbrs.lol/api/ingest \
  -H "X-API-KEY: YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '[
    {"metric_key": "relay_latency_connect_ms", "value": 120, "relay_url": "wss://nos.lol"},
    {"metric_key": "relay_up", "value": 1, "relay_url": "wss://nos.lol"}
  ]'

# With custom timestamp and tags
curl -X POST https://numbrs.lol/api/ingest \
  -H "X-API-KEY: YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "key": "server.cpu_pct",
    "value": 55.2,
    "recorded_at": "2026-03-27T12:00:00Z",
    "tags": {"host": "web-01", "region": "us-east"}
  }'
```

**Field reference:**

| Field | Required | Description |
|---|---|---|
| `key` or `metric_key` | Yes | Metric identifier (auto-created on first use) |
| `value` | Yes | Numeric value |
| `relay_url` | No | Associate with a relay (auto-created if new) |
| `recorded_at` or `timestamp` | No | ISO 8601 timestamp (defaults to now) |
| `tags` or `dimensions` | No | Key-value labels |
