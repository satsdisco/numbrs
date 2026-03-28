# numbrs — Agent Setup Guide

numbrs is a personal infrastructure monitoring dashboard. This guide helps AI agents configure numbrs for users via the REST API.

**Base URL:** `https://numbrs.lol`
**OpenAPI 3.0 spec:** `https://numbrs.lol/openapi.json`
**Interactive API docs:** `https://numbrs.lol/docs/api`

---

## Step 0: Account Creation & API Key

Before anything else, the user needs an account and an API key. **Guide them through this first.**

### Create an Account

1. Go to **https://numbrs.lol**
2. Click **Sign In**
3. Choose a login method:
   - **Nostr** — sign in with a Nostr extension (nos2x, Alby, etc.) or paste an npub
   - **Email** — enter an email address to receive a magic link
4. That's it — account is created on first sign-in

### Generate an API Key

1. After signing in, go to **https://numbrs.lol/api-keys**
2. Click **Create API Key**
3. Give it a name (e.g. "My Bot", "Home Server")
4. Copy the key — it's shown only once

### Test the Key

```bash
curl https://numbrs.lol/api/me \
  -H "X-API-KEY: YOUR_KEY"
```

A successful response returns your account info. If you get `401`, the key is invalid or expired.

### Authentication

All API calls require an `X-API-KEY` header:

```bash
-H "X-API-KEY: YOUR_KEY"
```

---

## Setup With Your AI Assistant

If you're a user reading this, here are things you can ask your AI assistant to do:

- *"Set up numbrs to monitor my Nostr relays"*
- *"Add Bitcoin price and mempool stats to my dashboard"*
- *"Monitor my server's CPU, RAM, and disk usage"*
- *"Set up uptime monitoring for my website"*
- *"Track my GitHub repo stats"*
- *"Create a Bitaxe mining dashboard"*
- *"Add weather data for my city"*
- *"Set up a speedtest tracker for my home network"*
- *"Monitor my Pi-hole DNS stats"*
- *"Track my ListenBrainz listening history"*
- *"Build me a custom dashboard with BTC price, server health, and relay stats"*

Your AI needs your **API key** (from Step 0 above) and may need a few details depending on the integration (e.g. your Bitaxe IP, relay URLs, city name). It can handle the rest.

---

## Integration Quick Reference

All 29 integrations at a glance. **Server-side** = enable in Settings → Integrations (no scripts needed). **Collector** = runs on your machine via cron. **Manual** = push data via curl/code.

| # | Integration | Type | Difficulty | API Key? | Key Metrics |
|---|---|---|---|---|---|
| 1 | Bitcoin Price | server-side | easy | No | `bitcoin.price_usd` |
| 2 | Mempool.space | server-side | easy | No | `mempool.fees.fastest`, `mempool.block_height`, `mempool.hashrate` |
| 3 | Moscow Time | server-side | easy | No | `bitcoin.moscow_time` |
| 4 | Halving Countdown | server-side | easy | No | `mempool.halving_blocks_remaining`, `mempool.halving_progress_pct` |
| 5 | Fear & Greed Index | server-side | easy | No | `fng.value`, `fng.classification` |
| 6 | Lightning Network | server-side | easy | No | `lightning.capacity_btc`, `lightning.channel_count`, `lightning.node_count` |
| 7 | Bisq DEX | collector | medium | No | `bisq.volume_btc`, `bisq.trade_count` |
| 8 | Open-Meteo Weather | server-side | easy | No | `weather.{location}.temperature`, `weather.{location}.humidity` |
| 9 | Air Quality | collector | medium | No | `air.aqi`, `air.pm2_5` |
| 10 | CoinGecko | server-side | easy | No | `coingecko.btc_dominance`, `coingecko.total_market_cap_usd` |
| 11 | FRED (M2/CPI) | server-side | medium | Yes (free) | `fred.m2_money_supply`, `fred.cpi`, `fred.fed_funds_rate` |
| 12 | GitHub Stats | server-side | easy | No | `github.{repo}.stars`, `github.{repo}.forks`, `github.{repo}.issues` |
| 13 | Vercel | server-side | easy | Yes | `vercel.deploys`, `vercel.build_ms` |
| 14 | WakaTime | collector | easy | Yes | `wakatime.coding_seconds`, `wakatime.languages.{lang}` |
| 15 | HTTP API | manual | easy | Yes | (any custom metric) |
| 16 | GitHub Actions | manual | easy | Yes | (deploy/test/build metrics) |
| 17 | Bash / Cron | manual | easy | Yes | (any custom metric) |
| 18 | Docker Stats | collector | medium | No | `docker.{container}.cpu_pct`, `docker.{container}.mem_mb` |
| 19 | Speedtest | collector | medium | No | `speedtest.download_mbps`, `speedtest.upload_mbps`, `speedtest.ping_ms` |
| 20 | Pi-hole | collector | medium | No | `pihole.queries_today`, `pihole.blocked_today`, `pihole.blocked_pct` |
| 21 | Last.fm | collector | easy | Yes | `lastfm.scrobbles_today`, `lastfm.scrobbles_total` |
| 22 | ListenBrainz | collector | easy | No | `listenbrainz.total_listens`, `listenbrainz.listens_today` |
| 23 | Nostr Stats | collector | medium | No | `nostr.{npub}.followers`, `nostr.{npub}.notes` |
| 24 | Plex | collector | medium | Yes | `plex.active_streams`, `plex.library.movies.count` |
| 25 | Jellyfin | collector | medium | Yes | `jellyfin.active_streams`, `jellyfin.song_count` |
| 26 | Todoist | collector | easy | Yes | `todoist.completed_today`, `todoist.karma` |
| 27 | Google Calendar | collector | medium | No | `calendar.events_today`, `calendar.events_tomorrow` |
| 28 | ISS Tracker | collector | easy | No | `iss.latitude`, `iss.longitude`, `iss.altitude_km` |
| 29 | USGS Earthquakes | collector | easy | No | `usgs.quake_count_24h`, `usgs.max_magnitude_24h` |
| 30 | Day Length | collector | easy | No | `daylight.hours` |

---

## Setup Flows by Category

### ₿ Bitcoin & Lightning

#### Bitcoin Price (server-side, one-click)

BTC/USD spot price from Coinbase, collected automatically every few minutes.

**Setup:** Enable in **Settings → Integrations** — no config needed.

**Metric:** `bitcoin.price_usd`

```bash
# Create a dashboard with BTC price
curl -X POST https://numbrs.lol/api/dashboards/from-template \
  -H "X-API-KEY: YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{"template": "personal-overview"}'
```

#### Mempool.space (server-side, one-click)

Fee rates, hashrate, difficulty, block height, and mempool stats.

**Setup:** Enable in **Settings → Integrations** — no config needed.

**Metrics:** `mempool.fees.fastest`, `mempool.fees.hour`, `mempool.fees.economy`, `mempool.hashrate`, `mempool.difficulty`, `mempool.block_height`, `mempool.tx_count`, `mempool.vsize`

```bash
# Push mempool data manually (if you prefer your own collector)
curl -X POST https://numbrs.lol/api/ingest \
  -H "X-API-KEY: YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '[
    {"key": "mempool.fees.fastest", "value": 12},
    {"key": "mempool.block_height", "value": 890123}
  ]'
```

#### Moscow Time (server-side, one-click)

Sats per dollar — how many satoshis one USD buys. Derived from Bitcoin Price automatically.

**Setup:** Enable in **Settings → Integrations** — requires Bitcoin Price to also be enabled.

**Metric:** `bitcoin.moscow_time`

#### Halving Countdown (server-side, one-click)

Blocks remaining until the next Bitcoin halving (block 1,050,000). Derived from Mempool block height.

**Setup:** Enable in **Settings → Integrations** — requires Mempool to also be enabled.

**Metrics:** `mempool.halving_blocks_remaining`, `mempool.halving_progress_pct`

#### Fear & Greed Index (server-side, one-click)

Market sentiment score (0–100) from alternative.me.

**Setup:** Enable in **Settings → Integrations** — no config needed.

**Metrics:** `fng.value` (0–100), `fng.classification` (Extreme Fear / Fear / Neutral / Greed / Extreme Greed)

#### Lightning Network (server-side, one-click)

Network capacity, channel count, and node count from mempool.space.

**Setup:** Enable in **Settings → Integrations** — no config needed.

**Metrics:** `lightning.capacity_btc`, `lightning.channel_count`, `lightning.node_count`

#### Bisq DEX (collector)

Trade volume and offer counts from the Bisq decentralised exchange.

```bash
# Example: push Bisq data
curl -X POST https://numbrs.lol/api/ingest \
  -H "X-API-KEY: YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '[
    {"key": "bisq.volume_btc", "value": 42.5},
    {"key": "bisq.trade_count", "value": 128}
  ]'
```

#### Bitaxe Mining (collector)

Monitor hashrate, temperature, shares, and power for Bitaxe ASIC miners.

**Step 1 — Download and configure the collector**

```bash
curl -o ~/bitaxe-collector.sh https://numbrs.lol/scripts/bitaxe-collector.sh
chmod +x ~/bitaxe-collector.sh
sed -i 's/YOUR_KEY/your-actual-api-key/' ~/bitaxe-collector.sh
sed -i 's/192.168.1.100/your-bitaxe-ip/' ~/bitaxe-collector.sh
```

Or save this script manually:

```bash
#!/bin/bash
API_KEY="YOUR_KEY"
BITAXE_IP="192.168.1.100"
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
    {\"key\": \"bitaxe.hashrate_ghs\",    \"value\": $hashrate},
    {\"key\": \"bitaxe.temp_c\",           \"value\": $temp},
    {\"key\": \"bitaxe.power_w\",          \"value\": $power},
    {\"key\": \"bitaxe.best_diff\",        \"value\": $best_diff},
    {\"key\": \"bitaxe.shares_accepted\",  \"value\": $shares},
    {\"key\": \"bitaxe.shares_rejected\",  \"value\": $rejected}
  ]"
```

**Step 2 — Set up cron (every minute)**

```bash
(crontab -l 2>/dev/null; echo "* * * * * $HOME/bitaxe-collector.sh") | crontab -
```

**Step 3 — Create dashboard + alert**

```bash
curl -X POST https://numbrs.lol/api/dashboards/from-template \
  -H "X-API-KEY: YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{"template": "bitaxe"}'

curl -X POST https://numbrs.lol/api/alerts \
  -H "X-API-KEY: YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{"name": "Hashrate Drop", "metric": "bitaxe.hashrate_ghs", "condition": "lt", "threshold": 400}'
```

---

### 🌤️ Weather & Environment

#### Open-Meteo Weather (server-side)

Temperature, humidity, rain, snow, UV index, and wind. Free, no API key.

**Setup:** Enable in **Settings → Integrations** and set your location (city name or lat/lon).

**Metrics:** `weather.{location}.temperature`, `weather.{location}.humidity`, `weather.{location}.precipitation`, `weather.{location}.rain`, `weather.{location}.snowfall`, `weather.{location}.wind_speed`, `weather.{location}.uv_index`

#### Air Quality (collector)

AQI, PM2.5, PM10, and ozone from Open-Meteo air quality API.

```bash
#!/bin/bash
# air-quality-collector.sh
# Run every 30 min: */30 * * * * bash /path/to/air-quality-collector.sh
API_KEY="YOUR_KEY"
LAT="50.08"   # Your latitude
LON="14.44"   # Your longitude

data=$(curl -sf "https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${LAT}&longitude=${LON}&current=european_aqi,pm2_5,pm10,ozone") || exit 1

aqi=$(echo "$data" | jq -r '.current.european_aqi // 0')
pm25=$(echo "$data" | jq -r '.current.pm2_5 // 0')
pm10=$(echo "$data" | jq -r '.current.pm10 // 0')

curl -sf -X POST "https://numbrs.lol/api/ingest" \
  -H "Content-Type: application/json" \
  -H "X-API-KEY: $API_KEY" \
  -d "[
    {\"key\": \"air.aqi\",   \"value\": $aqi},
    {\"key\": \"air.pm2_5\", \"value\": $pm25},
    {\"key\": \"air.pm10\",  \"value\": $pm10}
  ]"
```

---

### 📈 Finance & Markets

#### CoinGecko (server-side, one-click)

BTC dominance, total market cap, 24h volume. No API key needed.

**Setup:** Enable in **Settings → Integrations** — no config needed.

**Metrics:** `coingecko.btc_dominance`, `coingecko.total_market_cap_usd`, `coingecko.total_volume_24h`, `coingecko.active_cryptocurrencies`

#### FRED — M2, CPI, Fed Funds (server-side)

US M2 money supply, CPI, and Fed funds rate from the Federal Reserve FRED API.

**Setup:** Enable in **Settings → Integrations**. Requires a free FRED API key from https://fred.stlouisfed.org/docs/api/api_key.html

**Metrics:** `fred.m2_money_supply`, `fred.cpi`, `fred.fed_funds_rate`

---

### 🐙 Developer

#### GitHub Stats (server-side)

Stars, forks, and open issues for your public repos. Collected automatically.

**Setup:** Enable in **Settings → Integrations** and specify which repos to track.

**Metrics:** `github.{owner}.{repo}.stars`, `github.{owner}.{repo}.forks`, `github.{owner}.{repo}.issues`

```bash
# Create dashboards
curl -X POST https://numbrs.lol/api/dashboards/from-template \
  -H "X-API-KEY: YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{"template": "github-project"}'

# Or for multiple repos side by side
curl -X POST https://numbrs.lol/api/dashboards/from-template \
  -H "X-API-KEY: YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{"template": "github-projects"}'
```

#### Vercel (server-side)

Deploy counts, build durations, error rates.

**Setup:** Enable in **Settings → Integrations** with your Vercel API token. Also add a webhook in Vercel → Project → Settings → Webhooks pointing to `https://numbrs.lol/api/ingest`.

**Metrics:** `vercel.deploys`, `vercel.build_ms`

```bash
curl -X POST https://numbrs.lol/api/dashboards/from-template \
  -H "X-API-KEY: YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{"template": "vercel-site"}'
```

#### WakaTime (collector)

Coding time, languages, and project breakdown.

```bash
#!/bin/bash
# wakatime-collector.sh — Run daily: 0 23 * * * bash /path/to/wakatime-collector.sh
API_KEY="YOUR_KEY"
WAKATIME_KEY="YOUR_WAKATIME_API_KEY"

data=$(curl -sf "https://wakatime.com/api/v1/users/current/summaries?range=today" \
  -H "Authorization: Basic $(echo -n $WAKATIME_KEY | base64)") || exit 1

total_seconds=$(echo "$data" | jq -r '.cumulative_total.seconds // 0')

curl -sf -X POST "https://numbrs.lol/api/ingest" \
  -H "Content-Type: application/json" \
  -H "X-API-KEY: $API_KEY" \
  -d "{\"key\": \"wakatime.coding_seconds\", \"value\": $total_seconds}"
```

#### HTTP API (manual)

Push metrics from any language or tool with a simple POST request. See the [Ingest Format Reference](#ingest-format-reference) below.

```bash
# Push any custom metric
curl -X POST https://numbrs.lol/api/ingest \
  -H "X-API-KEY: YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{"key": "my.custom.metric", "value": 42}'
```

#### GitHub Actions (manual)

Track deploys, test runs, and build metrics from CI/CD. Add this step to your workflow:

```yaml
- name: Push metrics to numbrs
  run: |
    curl -sf -X POST https://numbrs.lol/api/ingest \
      -H "Content-Type: application/json" \
      -H "X-API-KEY: ${{ secrets.NUMBRS_API_KEY }}" \
      -d "[
        {\"key\": \"ci.build_duration_ms\", \"value\": ${{ steps.build.outputs.duration }}},
        {\"key\": \"ci.test_pass_count\", \"value\": ${{ steps.test.outputs.passed }}},
        {\"key\": \"ci.deploy_count\", \"value\": 1}
      ]"
```

---

### 🖥️ Infrastructure

#### System Health (collector)

CPU, RAM, disk, and network for any Linux/macOS server.

**Step 1 — Download and configure**

```bash
curl -o ~/system-collector.sh https://numbrs.lol/scripts/system-collector.sh
chmod +x ~/system-collector.sh
sed -i 's/YOUR_KEY/your-actual-api-key/' ~/system-collector.sh
```

Or save this script manually:

```bash
#!/bin/bash
# system-collector.sh — Linux + macOS
# Run every minute: * * * * * /path/to/system-collector.sh
API_KEY="YOUR_KEY"
INGEST_URL="https://numbrs.lol/api/ingest"

if [[ "$(uname)" == "Darwin" ]]; then
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
    {\"key\": \"system.cpu_pct\",               \"value\": ${cpu:-0}},
    {\"key\": \"system.ram_pct\",               \"value\": ${ram_pct:-0}},
    {\"key\": \"system.ram_used_mb\",           \"value\": ${ram_used_mb:-0}},
    {\"key\": \"system.disk_boot_pct\",         \"value\": ${disk_pct:-0}},
    {\"key\": \"system.disk_external_free_gb\", \"value\": ${disk_free_gb:-0}}
  ]"
```

**Step 2 — Cron + dashboard + alerts**

```bash
(crontab -l 2>/dev/null; echo "* * * * * $HOME/system-collector.sh") | crontab -

curl -X POST https://numbrs.lol/api/dashboards/from-template \
  -H "X-API-KEY: YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{"template": "system-health"}'

curl -X POST https://numbrs.lol/api/alerts \
  -H "X-API-KEY: YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{"name": "High CPU", "metric": "system.cpu_pct", "condition": "gt", "threshold": 90}'

curl -X POST https://numbrs.lol/api/alerts \
  -H "X-API-KEY: YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{"name": "Disk Full", "metric": "system.disk_boot_pct", "condition": "gt", "threshold": 85}'
```

#### Docker Stats (collector)

Container CPU, memory, and network I/O.

```bash
#!/bin/bash
# docker-collector.sh — Run every minute: * * * * * bash /path/to/docker-collector.sh
API_KEY="YOUR_KEY"

docker stats --no-stream --format '{{.Name}} {{.CPUPerc}} {{.MemUsage}}' | while read name cpu mem; do
  cpu_val=$(echo "$cpu" | tr -d '%')
  mem_mb=$(echo "$mem" | awk -F'/' '{gsub(/[^0-9.]/, "", $1); print $1}')
  
  curl -sf -X POST "https://numbrs.lol/api/ingest" \
    -H "Content-Type: application/json" \
    -H "X-API-KEY: $API_KEY" \
    -d "[
      {\"key\": \"docker.${name}.cpu_pct\", \"value\": $cpu_val},
      {\"key\": \"docker.${name}.mem_mb\",  \"value\": $mem_mb}
    ]"
done
```

#### Speedtest (collector)

Internet speed tests via Ookla Speedtest CLI.

**Step 1 — Download collector**

```bash
curl -o ~/speedtest-collector.sh https://numbrs.lol/scripts/speedtest-collector.sh
chmod +x ~/speedtest-collector.sh
sed -i 's/YOUR_KEY/your-actual-api-key/' ~/speedtest-collector.sh
```

Or manually:

```bash
#!/bin/bash
# speedtest-collector.sh — Run every 30 min: */30 * * * * bash /path/to/speedtest-collector.sh
API_KEY="YOUR_KEY"

# Requires: speedtest-cli (pip install speedtest-cli) or Ookla speedtest
result=$(speedtest-cli --json 2>/dev/null) || exit 1

download=$(echo "$result" | jq -r '.download / 1000000')
upload=$(echo "$result" | jq -r '.upload / 1000000')
ping=$(echo "$result" | jq -r '.ping')

curl -sf -X POST "https://numbrs.lol/api/ingest" \
  -H "Content-Type: application/json" \
  -H "X-API-KEY: $API_KEY" \
  -d "[
    {\"key\": \"speedtest.download_mbps\", \"value\": $download},
    {\"key\": \"speedtest.upload_mbps\",   \"value\": $upload},
    {\"key\": \"speedtest.ping_ms\",       \"value\": $ping}
  ]"
```

**Step 2 — Cron (every 30 min)**

```bash
(crontab -l 2>/dev/null; echo "*/30 * * * * $HOME/speedtest-collector.sh") | crontab -
```

#### Pi-hole (collector)

DNS query counts, blocked counts, and blocklist size.

**Step 1 — Download collector**

```bash
curl -o ~/pihole-collector.sh https://numbrs.lol/scripts/pihole-collector.sh
chmod +x ~/pihole-collector.sh
sed -i 's/YOUR_KEY/your-actual-api-key/' ~/pihole-collector.sh
```

Or manually:

```bash
#!/bin/bash
# pihole-collector.sh — Run every 15 min: */15 * * * * bash /path/to/pihole-collector.sh
API_KEY="YOUR_KEY"
PIHOLE_URL="http://pi.hole"  # Or your Pi-hole IP

data=$(curl -sf "${PIHOLE_URL}/admin/api.php?summary") || exit 1

queries=$(echo "$data" | jq -r '.dns_queries_today // 0')
blocked=$(echo "$data" | jq -r '.ads_blocked_today // 0')
blocked_pct=$(echo "$data" | jq -r '.ads_percentage_today // 0')
blocklist=$(echo "$data" | jq -r '.domains_being_blocked // 0')

curl -sf -X POST "https://numbrs.lol/api/ingest" \
  -H "Content-Type: application/json" \
  -H "X-API-KEY: $API_KEY" \
  -d "[
    {\"key\": \"pihole.queries_today\",        \"value\": $queries},
    {\"key\": \"pihole.blocked_today\",        \"value\": $blocked},
    {\"key\": \"pihole.blocked_pct\",          \"value\": $blocked_pct},
    {\"key\": \"pihole.domains_on_blocklist\", \"value\": $blocklist}
  ]"
```

#### Bash / Cron (manual)

Track any server metric from a shell script. Just POST to the ingest endpoint:

```bash
# Example: track a custom metric from any script
curl -X POST https://numbrs.lol/api/ingest \
  -H "X-API-KEY: YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{"key": "myserver.connection_count", "value": 42}'
```

#### Uptime Monitoring (server-side)

HTTP and WebSocket endpoints checked automatically every minute.

```bash
# Add HTTP endpoint
curl -X POST https://numbrs.lol/api/monitors \
  -H "X-API-KEY: YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{"name": "My API", "url": "https://api.example.com/health", "type": "http"}'

# Add WebSocket relay
curl -X POST https://numbrs.lol/api/monitors \
  -H "X-API-KEY: YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{"name": "My Relay", "url": "wss://relay.example.com", "type": "wss"}'

# Create uptime dashboard
curl -X POST https://numbrs.lol/api/dashboards/from-template \
  -H "X-API-KEY: YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{"template": "uptime-overview"}'
```

---

### 🎵 Media & Social

#### Nostr Relay Monitoring (server-side)

Monitor latency, uptime, and event throughput for Nostr relays.

**Step 1 — Add relays**

```bash
curl -X POST https://numbrs.lol/api/relays \
  -H "X-API-KEY: YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{"name": "nos.lol", "url": "wss://nos.lol"}'
```

**Step 2 — Create dashboard + alerts**

```bash
curl -X POST https://numbrs.lol/api/dashboards/from-template \
  -H "X-API-KEY: YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{"template": "relay-health"}'

curl -X POST https://numbrs.lol/api/alerts \
  -H "X-API-KEY: YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{"name": "High Latency", "metric": "relay_latency_connect_ms", "condition": "gt", "threshold": 1000}'

curl -X POST https://numbrs.lol/api/alerts \
  -H "X-API-KEY: YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{"name": "Relay Down", "metric": "relay_up", "condition": "lt", "threshold": 1}'
```

Relay probe runs automatically every ~5 minutes. Data appears within minutes of adding relays.

#### Self-Hosted Nostr Relay Stats (collector)

Push DB size and pubkey counts from your Haven/Khatru relay.

```bash
DB_SIZE=$(du -sm /path/to/relay/db | awk '{print $1}')
PUBKEYS=$(sqlite3 /path/to/relay/db "SELECT COUNT(DISTINCT pubkey) FROM events")

curl -X POST https://numbrs.lol/api/ingest \
  -H "X-API-KEY: YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d "[
    {\"key\": \"relay.myrelay.db_size_mb\", \"value\": $DB_SIZE},
    {\"key\": \"relay.myrelay.pubkeys\",    \"value\": $PUBKEYS}
  ]"
```

```bash
curl -X POST https://numbrs.lol/api/dashboards/from-template \
  -H "X-API-KEY: YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{"template": "nostr-relays"}'
```

#### Nostr Profile Stats (collector)

Follower count and note count for your npub.

```bash
#!/bin/bash
# nostr-stats-collector.sh — Run every hour
API_KEY="YOUR_KEY"
NPUB="npub1..."  # Your npub

# Use a Nostr API or relay to fetch follower/note counts
# Example using nostr.band API:
data=$(curl -sf "https://api.nostr.band/v0/stats/profile/${NPUB}") || exit 1

followers=$(echo "$data" | jq -r '.stats[0].followers_pubkey_count // 0')
notes=$(echo "$data" | jq -r '.stats[0].pub_note_count // 0')

curl -sf -X POST "https://numbrs.lol/api/ingest" \
  -H "Content-Type: application/json" \
  -H "X-API-KEY: $API_KEY" \
  -d "[
    {\"key\": \"nostr.account1.followers\", \"value\": $followers},
    {\"key\": \"nostr.account1.notes\",     \"value\": $notes}
  ]"
```

#### Last.fm (collector)

Scrobble counts and top artists.

```bash
#!/bin/bash
# lastfm-collector.sh — Run every hour: 0 * * * * bash /path/to/lastfm-collector.sh
API_KEY="YOUR_KEY"
LASTFM_KEY="YOUR_LASTFM_API_KEY"
LASTFM_USER="your-username"

data=$(curl -sf "http://ws.audioscrobbler.com/2.0/?method=user.getinfo&user=${LASTFM_USER}&api_key=${LASTFM_KEY}&format=json") || exit 1

total=$(echo "$data" | jq -r '.user.playcount // 0')

curl -sf -X POST "https://numbrs.lol/api/ingest" \
  -H "Content-Type: application/json" \
  -H "X-API-KEY: $API_KEY" \
  -d "[
    {\"key\": \"lastfm.scrobbles_total\", \"value\": $total}
  ]"
```

#### ListenBrainz (collector)

Total listens, today's listens, and weekly activity. No API key needed for public data.

**Download collector:**

```bash
curl -o ~/listenbrainz-collector.sh https://numbrs.lol/scripts/listenbrainz-collector.sh
chmod +x ~/listenbrainz-collector.sh
sed -i 's/YOUR_KEY/your-actual-api-key/' ~/listenbrainz-collector.sh
```

Or manually:

```bash
#!/bin/bash
# listenbrainz-collector.sh — Run every hour
API_KEY="YOUR_KEY"
LB_USER="your-username"

data=$(curl -sf "https://api.listenbrainz.org/1/user/${LB_USER}/listen-count") || exit 1
total=$(echo "$data" | jq -r '.payload.count // 0')

curl -sf -X POST "https://numbrs.lol/api/ingest" \
  -H "Content-Type: application/json" \
  -H "X-API-KEY: $API_KEY" \
  -d "{\"key\": \"listenbrainz.total_listens\", \"value\": $total}"
```

#### Plex (collector)

Active streams and library sizes.

**Step 1 — Configure webhook** in Plex Web → Settings → Webhooks:
```
https://numbrs.lol/functions/v1/plex-webhook
```

Or use the integration setup in **Settings → Integrations**.

**Step 2 — Create dashboard**

```bash
curl -X POST https://numbrs.lol/api/dashboards/from-template \
  -H "X-API-KEY: YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{"template": "plex-media-server"}'
```

#### Jellyfin (collector)

Active sessions and library stats.

```bash
#!/bin/bash
# jellyfin-collector.sh — Run every 5 min
API_KEY="YOUR_KEY"
JELLYFIN_URL="http://your-jellyfin-ip:8096"
JELLYFIN_KEY="your-jellyfin-api-key"

sessions=$(curl -sf "${JELLYFIN_URL}/Sessions?api_key=${JELLYFIN_KEY}" | jq 'map(select(.NowPlayingItem)) | length')
songs=$(curl -sf "${JELLYFIN_URL}/Items/Counts?api_key=${JELLYFIN_KEY}" | jq -r '.SongCount // 0')
albums=$(curl -sf "${JELLYFIN_URL}/Items/Counts?api_key=${JELLYFIN_KEY}" | jq -r '.AlbumCount // 0')

curl -sf -X POST "https://numbrs.lol/api/ingest" \
  -H "Content-Type: application/json" \
  -H "X-API-KEY: $API_KEY" \
  -d "[
    {\"key\": \"jellyfin.active_streams\", \"value\": ${sessions:-0}},
    {\"key\": \"jellyfin.song_count\",     \"value\": ${songs:-0}},
    {\"key\": \"jellyfin.album_count\",    \"value\": ${albums:-0}}
  ]"
```

```bash
curl -X POST https://numbrs.lol/api/dashboards/from-template \
  -H "X-API-KEY: YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{"template": "mac-mini-health"}'
```

---

### 📅 Productivity

#### Todoist (collector)

Task completion rates and karma.

```bash
#!/bin/bash
# todoist-collector.sh — Run daily: 0 23 * * * bash /path/to/todoist-collector.sh
API_KEY="YOUR_KEY"
TODOIST_TOKEN="your-todoist-api-token"

# Get completed tasks today
completed=$(curl -sf "https://api.todoist.com/sync/v9/completed/get_all" \
  -H "Authorization: Bearer $TODOIST_TOKEN" | jq '.items | length')

# Get karma
karma=$(curl -sf "https://api.todoist.com/sync/v9/sync" \
  -H "Authorization: Bearer $TODOIST_TOKEN" \
  -d 'resource_types=["user"]' | jq -r '.user.karma // 0')

curl -sf -X POST "https://numbrs.lol/api/ingest" \
  -H "Content-Type: application/json" \
  -H "X-API-KEY: $API_KEY" \
  -d "[
    {\"key\": \"todoist.completed_today\", \"value\": ${completed:-0}},
    {\"key\": \"todoist.karma\",           \"value\": ${karma:-0}}
  ]"
```

#### Google Calendar (collector)

Events today, events tomorrow, and hours until next event.

**Download collector:**

```bash
curl -o ~/calendar-collector.sh https://numbrs.lol/scripts/calendar-collector.sh
chmod +x ~/calendar-collector.sh
sed -i 's/YOUR_KEY/your-actual-api-key/' ~/calendar-collector.sh
```

Requires the `gog` CLI (Google Workspace CLI) to be installed and authenticated.

```bash
# Run every 30 min
(crontab -l 2>/dev/null; echo "*/30 * * * * $HOME/calendar-collector.sh") | crontab -
```

---

### 🎲 Fun & Novelty

#### ISS Tracker (collector)

Real-time latitude, longitude, and altitude of the International Space Station.

```bash
#!/bin/bash
# iss-collector.sh — Run every 5 min: */5 * * * * bash /path/to/iss-collector.sh
API_KEY="YOUR_KEY"

data=$(curl -sf "http://api.open-notify.org/iss-now.json") || exit 1

lat=$(echo "$data" | jq -r '.iss_position.latitude')
lon=$(echo "$data" | jq -r '.iss_position.longitude')

curl -sf -X POST "https://numbrs.lol/api/ingest" \
  -H "Content-Type: application/json" \
  -H "X-API-KEY: $API_KEY" \
  -d "[
    {\"key\": \"iss.latitude\",  \"value\": $lat},
    {\"key\": \"iss.longitude\", \"value\": $lon}
  ]"
```

#### USGS Earthquakes (collector)

Recent earthquake count and max magnitude.

```bash
#!/bin/bash
# earthquake-collector.sh — Run every hour: 0 * * * * bash /path/to/earthquake-collector.sh
API_KEY="YOUR_KEY"

data=$(curl -sf "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/1.0_day.geojson") || exit 1

count=$(echo "$data" | jq '.metadata.count // 0')
max_mag=$(echo "$data" | jq '[.features[].properties.mag] | max // 0')

curl -sf -X POST "https://numbrs.lol/api/ingest" \
  -H "Content-Type: application/json" \
  -H "X-API-KEY: $API_KEY" \
  -d "[
    {\"key\": \"usgs.quake_count_24h\",   \"value\": $count},
    {\"key\": \"usgs.max_magnitude_24h\",  \"value\": $max_mag}
  ]"
```

#### Day Length (collector)

Hours of daylight for your location.

```bash
#!/bin/bash
# daylength-collector.sh — Run daily: 0 12 * * * bash /path/to/daylength-collector.sh
API_KEY="YOUR_KEY"
LAT="50.08"
LON="14.44"

data=$(curl -sf "https://api.sunrise-sunset.org/json?lat=${LAT}&lng=${LON}&formatted=0") || exit 1

# day_length is in seconds
day_seconds=$(echo "$data" | jq -r '.results.day_length // 0')
day_hours=$(echo "scale=2; $day_seconds / 3600" | bc)

curl -sf -X POST "https://numbrs.lol/api/ingest" \
  -H "Content-Type: application/json" \
  -H "X-API-KEY: $API_KEY" \
  -d "{\"key\": \"daylight.hours\", \"value\": $day_hours}"
```

---

## Enabling Server-Side Integrations (API)

Server-side integrations (Bitcoin, Mempool, Weather, GitHub, etc.) can be enabled programmatically via the API — no need to visit the UI.

### Enable an Integration

```bash
# Enable Bitcoin Price (no config needed)
curl -X POST https://numbrs.lol/api/integrations \
  -H "X-API-KEY: YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{"provider": "bitcoin"}'

# Enable Mempool.space (no config needed)
curl -X POST https://numbrs.lol/api/integrations \
  -H "X-API-KEY: YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{"provider": "mempool"}'

# Enable Moscow Time (derived from bitcoin — enable bitcoin first)
curl -X POST https://numbrs.lol/api/integrations \
  -H "X-API-KEY: YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{"provider": "moscow-time"}'

# Enable Halving Countdown (derived from mempool — enable mempool first)
curl -X POST https://numbrs.lol/api/integrations \
  -H "X-API-KEY: YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{"provider": "halving"}'

# Enable Fear & Greed
curl -X POST https://numbrs.lol/api/integrations \
  -H "X-API-KEY: YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{"provider": "fng"}'

# Enable Lightning Network
curl -X POST https://numbrs.lol/api/integrations \
  -H "X-API-KEY: YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{"provider": "lightning"}'

# Enable CoinGecko
curl -X POST https://numbrs.lol/api/integrations \
  -H "X-API-KEY: YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{"provider": "coingecko"}'

# Enable Weather (requires location config)
curl -X POST https://numbrs.lol/api/integrations \
  -H "X-API-KEY: YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{"provider": "weather", "config": {"latitude": 50.08, "longitude": 14.44, "location_name": "Prague"}}'

# Enable GitHub Stats (requires username and optionally specific repos)
curl -X POST https://numbrs.lol/api/integrations \
  -H "X-API-KEY: YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{"provider": "github", "config": {"username": "satsdisco", "repos": ["satsdisco/numbrs", "satsdisco/jellyamp-pwa"]}}'

# Enable FRED (requires free API key from fred.stlouisfed.org)
curl -X POST https://numbrs.lol/api/integrations \
  -H "X-API-KEY: YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{"provider": "fred", "config": {"api_key": "YOUR_FRED_API_KEY"}}'
```

### Available Provider IDs

| Provider | Config Required | Notes |
|---|---|---|
| `bitcoin` | None | BTC/USD from Coinbase |
| `mempool` | None | Fees, hashrate, blocks from mempool.space |
| `moscow-time` | None | Requires `bitcoin` enabled |
| `halving` | None | Requires `mempool` enabled |
| `fng` | None | Fear & Greed Index |
| `lightning` | None | Lightning network stats |
| `coingecko` | None | BTC dominance, market cap |
| `weather` | `{"latitude": N, "longitude": N, "location_name": "City"}` | Open-Meteo weather |
| `github` | `{"username": "...", "repos": ["owner/repo"]}` | GitHub repo stats |
| `fred` | `{"api_key": "..."}` | US economic data |

### List, Update, Delete Integrations

```bash
# List all enabled integrations
curl https://numbrs.lol/api/integrations \
  -H "X-API-KEY: YOUR_KEY"

# Update config for an integration
curl -X PATCH https://numbrs.lol/api/integrations/weather \
  -H "X-API-KEY: YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{"config": {"latitude": 48.85, "longitude": 2.35, "location_name": "Paris"}}'

# Disable (without deleting)
curl -X PATCH https://numbrs.lol/api/integrations/github \
  -H "X-API-KEY: YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{"is_active": false}'

# Delete an integration
curl -X DELETE https://numbrs.lol/api/integrations/weather \
  -H "X-API-KEY: YOUR_KEY"
```

---

## Building Custom Dashboards

Beyond templates, you can build fully custom dashboards via the API.

### Create an Empty Dashboard

```bash
curl -X POST https://numbrs.lol/api/dashboards \
  -H "X-API-KEY: YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{"name": "My Custom Dashboard", "description": "Tracking everything I care about"}'
```

Returns a JSON object with `id` (UUID), `name`, etc.

### Add Panels

Use the dashboard ID from the create response:

```bash
# Add an area chart panel
curl -X POST https://numbrs.lol/api/dashboards/DASHBOARD_UUID/panels \
  -H "X-API-KEY: YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "panel_type": "area",
    "title": "CPU Usage",
    "config": {"metric_key": "system.cpu_pct", "data_source": "custom", "unit": "%"},
    "layout": {"x": 0, "y": 0, "w": 6, "h": 4}
  }'

# Add a stat card
curl -X POST https://numbrs.lol/api/dashboards/DASHBOARD_UUID/panels \
  -H "X-API-KEY: YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "panel_type": "stat",
    "title": "BTC Price",
    "config": {"metric_key": "bitcoin.price_usd", "data_source": "custom", "stat_field": "latest", "unit": "$"},
    "layout": {"x": 6, "y": 0, "w": 3, "h": 2}
  }'

# Add a gauge
curl -X POST https://numbrs.lol/api/dashboards/DASHBOARD_UUID/panels \
  -H "X-API-KEY: YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "panel_type": "gauge",
    "title": "Disk Usage",
    "config": {"metric_key": "system.disk_boot_pct", "data_source": "custom", "stat_field": "latest", "gauge_max": 100, "unit": "%"},
    "layout": {"x": 9, "y": 0, "w": 3, "h": 3}
  }'
```

**Shorthand:** You can also use `"type"` instead of `"panel_type"`, and `"metrics": ["key"]` instead of putting `metric_key` in config. The API normalises both.

### Panel Types

| panel_type | Description | Good For |
|---|---|---|
| `stat` | Single big number with optional trend | BTC price, uptime %, follower count |
| `line` | Time series line graph | CPU over time, latency trends |
| `area` | Filled area chart | Hashrate, volume, usage |
| `gauge` | Circular gauge with thresholds | Disk usage, temperature |

### Panel Config Fields

| Field | Description |
|---|---|
| `metric_key` | Which metric to display (e.g. `system.cpu_pct`) |
| `data_source` | `"custom"` for ingest metrics, `"relay"` for relay probe data, `"global"` for network-wide |
| `stat_field` | For stat/gauge: `"latest"`, `"avg"`, `"sum"`, `"min"`, `"max"`, `"p95"` |
| `unit` | Display unit (e.g. `"%"`, `"ms"`, `"GH/s"`, `"$"`) |
| `gauge_max` | For gauges: maximum value (e.g. `100` for percentages) |

### Layout Grid

Dashboards use a 12-column grid. Each panel has `x`, `y`, `w` (width), `h` (height).

### Update and Delete Panels

```bash
# Update a panel
curl -X PATCH https://numbrs.lol/api/dashboards/DASHBOARD_UUID/panels/PANEL_UUID \
  -H "X-API-KEY: YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{"title": "Updated Title"}'

# Delete a panel
curl -X DELETE https://numbrs.lol/api/dashboards/DASHBOARD_UUID/panels/PANEL_UUID \
  -H "X-API-KEY: YOUR_KEY"
```

### List and Delete Dashboards

```bash
# List all dashboards
curl https://numbrs.lol/api/dashboards \
  -H "X-API-KEY: YOUR_KEY"

# List panels in a dashboard
curl https://numbrs.lol/api/dashboards/DASHBOARD_UUID/panels \
  -H "X-API-KEY: YOUR_KEY"

# Delete a dashboard (also deletes its panels)
curl -X DELETE https://numbrs.lol/api/dashboards/DASHBOARD_UUID \
  -H "X-API-KEY: YOUR_KEY"
```

---

## Listing Your Metrics

To see what metrics exist in your account (useful for building custom dashboards):

```bash
curl https://numbrs.lol/api/metrics \
  -H "X-API-KEY: YOUR_KEY"
```

Returns all metric keys, names, and units. Use these `key` values in panel configs.

---

## Server-Side Integrations (No Collector Needed)

These run automatically as edge functions. Just enable in **Settings → Integrations**:

| Function | What it does | Frequency |
|---|---|---|
| `relay-probe` | Probes Nostr relays — connect latency, first-event latency, uptime | Every ~5 min |
| `uptime-check` | HTTP/WSS checks for all uptime monitors | Every ~1 min |
| `collect-github` | Stars, forks, open issues for configured repos | Periodic |
| `collect-bitcoin` | BTC price from Coinbase | Periodic |
| `collect-mempool` | Fee rates, hashrate, block height from mempool.space | Periodic |
| `collect-moscow` | Sats per dollar (derived from BTC price) | Periodic |
| `collect-halving` | Blocks until next halving (derived from block height) | Periodic |
| `collect-fng` | Fear & Greed Index from alternative.me | Periodic |
| `collect-lightning` | Lightning capacity, channels, nodes from mempool.space | Periodic |
| `collect-coingecko` | BTC dominance, market cap, volume | Periodic |
| `collect-weather` | Temperature, humidity, wind, UV for configured location | Periodic |

---

## Available Dashboard Templates

All templates: `POST /api/dashboards/from-template` with `{"template": "<id>"}`.

### Nostr & Network

| Template ID | Name | Key Metrics |
|---|---|---|
| `relay-health` | Relay Health | `relay_latency_connect_ms`, `relay_latency_first_event_ms`, `relay_up` |
| `relay-overview` | Relay Overview | `relay_latency_connect_ms`, `relay_latency_first_event_ms`, `relay_up` |
| `network-health` | Network Health | `network_event_throughput`, `network_relay_count`, `network_avg_latency` |
| `zap-economy` | Zap Economy | `zap_volume_sats`, `zap_count`, `zap_avg_size` |
| `protocol-stats` | Protocol Analytics | `event_kind_1_count`, `event_propagation_ms`, `nip_support_score` |
| `nostr-relays` | Nostr Relays (self-hosted) | `relay.*.db_size_mb`, `relay.*.pubkeys` |

### Infrastructure

| Template ID | Name | Key Metrics |
|---|---|---|
| `system-health` | System Health | `system.cpu_pct`, `system.ram_pct`, `system.disk_boot_pct` |
| `mac-mini-health` | Mac Mini Health | `system.*`, `jellyfin.*` |
| `uptime-overview` | Uptime Overview | `uptime.pct`, `uptime.latency_ms`, `uptime.incidents` |
| `bitaxe` | Bitaxe Miner | `bitaxe.hashrate_ghs`, `bitaxe.temp_c`, `bitaxe.power_w` |

### Media

| Template ID | Name | Key Metrics |
|---|---|---|
| `media` | Media Server | `plex.*`, `jellyfin.*` |
| `plex-media-server` | Plex Media Server | `plex.active_streams`, `plex.library.*` |

### Personal & Dev

| Template ID | Name | Key Metrics |
|---|---|---|
| `github-project` | GitHub Project | `github.stars`, `github.forks`, `github.issues` |
| `github-projects` | GitHub Projects (multi-repo) | `github.*.stars`, `github.*.forks` |
| `vercel-site` | Vercel Site | `deploy.count`, `build.duration_ms`, `error.count` |
| `personal-overview` | Personal Overview | `bitcoin.price_usd`, `nostr.*.followers`, `github.*.stars` |
| `personal-stats` | Personal Stats | `dev.commits`, `habit.score`, `custom.*` |
| `claude-usage` | Claude Code Usage | `claude.total_tokens`, `claude.cost_usd`, `claude.sessions` |

---

## Claude Code Usage Tracking

Track your Claude Code token usage, sessions, projects, and model breakdown — using the same numbrs API key you already have. Data appears on the dedicated **Claude page** (`/claude`) with charts, project breakdowns, and ROI analysis.

No extra credentials needed. No Supabase setup. Just your numbrs API key.

### Step 1 — Install the collector

```bash
curl -o ~/claude-collector.sh https://numbrs.lol/scripts/claude-collector.sh
chmod +x ~/claude-collector.sh
sed -i 's/YOUR_KEY/your-actual-api-key/' ~/claude-collector.sh
```

Or set the key via environment variable:
```bash
export NUMBRS_API_KEY="your-actual-api-key"
```

The collector reads Claude Code session data from `~/.claude/usage/YYYY-MM-DD.json` and pushes each session (with project, model, token counts, tool calls) to your numbrs account. It uses upsert on `session_id` so re-runs are safe — no duplicates.

### Step 2 — Set up cron (hourly)

```bash
(crontab -l 2>/dev/null; echo "0 * * * * $HOME/claude-collector.sh") | crontab -
```

### Step 3 — View your data

Go to **https://numbrs.lol/claude** — the dedicated Claude page shows:
- **Overview** — combined OpenClaw + Claude Code usage, ROI analysis
- **OpenClaw tab** — usage by model, channel, peak hours heatmap
- **Claude Code tab** — usage by project, top sessions, token trends

### API: Push Claude usage directly

You can also push session data programmatically without the collector:

```bash
# Push a single session
curl -X POST https://numbrs.lol/api/claude-usage \
  -H "X-API-KEY: YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "date": "2026-03-28",
    "session_id": "unique-session-id",
    "project": "my-project",
    "messages": 42,
    "tool_calls": 15,
    "input_tokens": 50000,
    "output_tokens": 12000,
    "cache_read_tokens": 30000,
    "cache_write_tokens": 5000,
    "model": "claude-sonnet-4-6"
  }'

# Push multiple sessions at once
curl -X POST https://numbrs.lol/api/claude-usage \
  -H "X-API-KEY: YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '[
    {"date": "2026-03-28", "session_id": "sess-1", "project": "numbrs", "input_tokens": 50000, "output_tokens": 12000, "model": "claude-sonnet-4-6"},
    {"date": "2026-03-28", "session_id": "sess-2", "project": "myapp", "input_tokens": 80000, "output_tokens": 25000, "model": "claude-sonnet-4-6"}
  ]'

# Fetch your usage data
curl https://numbrs.lol/api/claude-usage?since=2026-03-01 \
  -H "X-API-KEY: YOUR_KEY"
```

**Fields:**

| Field | Required | Description |
|---|---|---|
| `date` | No | Day (YYYY-MM-DD), defaults to today |
| `session_id` | No | Unique session ID, auto-generated if omitted |
| `project` | No | Project name (e.g. "numbrs", "myapp") |
| `messages` | No | Message count |
| `tool_calls` | No | Tool calls made |
| `input_tokens` | No | Input token count |
| `output_tokens` | No | Output token count |
| `cache_read_tokens` | No | Cache-read tokens |
| `cache_write_tokens` | No | Cache-write tokens |
| `model` | No | Model ID (e.g. "claude-sonnet-4-6") |

---

## Ingest Format Reference

The `/api/ingest` endpoint accepts single objects or arrays:

```bash
# Single metric
curl -X POST https://numbrs.lol/api/ingest \
  -H "X-API-KEY: YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{"key": "system.cpu_pct", "value": 42.5}'

# Batch
curl -X POST https://numbrs.lol/api/ingest \
  -H "X-API-KEY: YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '[
    {"key": "relay_latency_connect_ms", "value": 120, "relay_url": "wss://nos.lol"},
    {"key": "relay_up", "value": 1, "relay_url": "wss://nos.lol"}
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
| `key` | Yes | Metric identifier (auto-created on first use). `metric_key` also accepted for backwards compatibility. |
| `value` | Yes | Numeric value |
| `relay_url` | No | Associate with a relay (auto-created if new) |
| `recorded_at` or `timestamp` | No | ISO 8601 timestamp (defaults to now) |
| `tags` or `dimensions` | No | Key-value labels for filtering |

---

## Example: Full Relay Monitoring Setup in One Go

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
curl -sf -X POST "$BASE/dashboards/from-template" -H "$H" -H "$CT" \
  -d '{"template":"relay-health","name":"My Relay Dashboard"}' | jq '{id: .id, panels: (.panels | length)}'

echo "3/5 — Adding latency alert..."
curl -sf -X POST "$BASE/alerts" -H "$H" -H "$CT" \
  -d '{"name":"High Latency","metric":"relay_latency_connect_ms","condition":"gt","threshold":1000}'

echo "4/5 — Adding uptime alert..."
curl -sf -X POST "$BASE/alerts" -H "$H" -H "$CT" \
  -d '{"name":"Relay Down","metric":"relay_up","condition":"lt","threshold":1}'

echo "5/5 — Checking account..."
curl -sf "$BASE/me" -H "$H" | jq .stats

echo "Done! Visit https://numbrs.lol/dashboards"
```

---

## Collector Scripts (Downloadable)

Pre-built scripts available at `https://numbrs.lol/scripts/`:

| Script | What it collects | Cron |
|---|---|---|
| `system-collector.sh` | CPU, RAM, disk (Linux + macOS) | Every minute |
| `bitaxe-collector.sh` | Hashrate, temp, shares, power | Every minute |
| `speedtest-collector.sh` | Download, upload, ping | Every 30 min |
| `pihole-collector.sh` | DNS queries, blocked, blocklist | Every 15 min |
| `listenbrainz-collector.sh` | Listen counts | Every hour |
| `calendar-collector.sh` | Calendar events (via gog CLI) | Every 30 min |
| `claude-collector.sh` | Claude Code tokens, sessions, cost | Every hour |
| `numbrs-collector.sh` | Full Mac mini health + Jellyfin | Every 5 min |

**Quick install pattern:**

```bash
curl -o ~/SCRIPT_NAME.sh https://numbrs.lol/scripts/SCRIPT_NAME.sh
chmod +x ~/SCRIPT_NAME.sh
sed -i 's/YOUR_KEY/your-actual-api-key/' ~/SCRIPT_NAME.sh
(crontab -l 2>/dev/null; echo "CRON_SCHEDULE $HOME/SCRIPT_NAME.sh") | crontab -
```
