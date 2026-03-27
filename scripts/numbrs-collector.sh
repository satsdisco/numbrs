#!/bin/bash
# numbrs-collector.sh — Mac mini health + Jellyfin metrics → numbrs
# Runs every 5 min via cron
#
# Required environment variables (set in scripts/.env or export before running):
#   NUMBRS_API_KEY, NUMBRS_INGEST, NUMBRS_SUPABASE_SERVICE_KEY,
#   JELLYFIN_URL, JELLYFIN_KEY
#
# Usage: source scripts/.env && bash scripts/numbrs-collector.sh

# Load .env if present
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [[ -f "$SCRIPT_DIR/.env" ]]; then
  set -a
  source "$SCRIPT_DIR/.env"
  set +a
fi

# Validate required variables
MISSING=()
[[ -z "${NUMBRS_API_KEY:-}" ]] && MISSING+=("NUMBRS_API_KEY")
[[ -z "${NUMBRS_INGEST:-}" ]] && MISSING+=("NUMBRS_INGEST")
[[ -z "${NUMBRS_SUPABASE_SERVICE_KEY:-}" ]] && MISSING+=("NUMBRS_SUPABASE_SERVICE_KEY")
[[ -z "${JELLYFIN_URL:-}" ]] && MISSING+=("JELLYFIN_URL")
[[ -z "${JELLYFIN_KEY:-}" ]] && MISSING+=("JELLYFIN_KEY")
[[ -z "${NUMBRS_OWNER_ID:-}" ]] && MISSING+=("NUMBRS_OWNER_ID")

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

# ── Mac mini health ──────────────────────────────────────────────────────────

# CPU usage (%)
CPU=$(ps -A -o %cpu | awk '{s+=$1} END {printf "%.1f", s}')
push "system.cpu_pct" "$CPU" "CPU Usage" "%"

# RAM usage (%)
RAM_STATS=$(vm_stat)
PAGES_FREE=$(echo "$RAM_STATS" | awk '/Pages free/ {gsub(/\./,"",$3); print $3}')
PAGES_ACTIVE=$(echo "$RAM_STATS" | awk '/Pages active/ {gsub(/\./,"",$3); print $3}')
PAGES_INACTIVE=$(echo "$RAM_STATS" | awk '/Pages inactive/ {gsub(/\./,"",$3); print $3}')
PAGES_WIRED=$(echo "$RAM_STATS" | awk '/Pages wired/ {gsub(/\./,"",$4); print $4}')
PAGES_COMPRESSED=$(echo "$RAM_STATS" | awk '/Pages occupied by compressor/ {gsub(/\./,"",$5); print $5}')
PAGE_SIZE=16384  # bytes on Apple Silicon

USED=$((( PAGES_ACTIVE + PAGES_WIRED + PAGES_COMPRESSED ) * PAGE_SIZE / 1024 / 1024))
TOTAL=$(( ( PAGES_FREE + PAGES_ACTIVE + PAGES_INACTIVE + PAGES_WIRED + PAGES_COMPRESSED ) * PAGE_SIZE / 1024 / 1024 ))
RAM_PCT=$(python3 -c "print(round($USED / $TOTAL * 100, 1))" 2>/dev/null || echo "0")
push "system.ram_pct" "$RAM_PCT" "RAM Usage" "%"
push "system.ram_used_mb" "$USED" "RAM Used" "MB"

# Disk usage on /Volumes/External (%)
EXT_USAGE=$(df -k /Volumes/External 2>/dev/null | awk 'NR==2 {gsub(/%/,"",$5); print $5}')
if [ -n "$EXT_USAGE" ]; then
  push "system.disk_external_pct" "$EXT_USAGE" "External Disk Usage" "%"
  EXT_AVAIL_GB=$(df -k /Volumes/External 2>/dev/null | awk 'NR==2 {printf "%.1f", $4/1024/1024}')
  push "system.disk_external_free_gb" "$EXT_AVAIL_GB" "External Disk Free" "GB"
fi

# Boot volume disk usage
BOOT_USAGE=$(df -k / 2>/dev/null | awk 'NR==2 {gsub(/%/,"",$5); print $5}')
push "system.disk_boot_pct" "$BOOT_USAGE" "Boot Disk Usage" "%"
BOOT_FREE_GB=$(df -k / 2>/dev/null | awk 'NR==2 {printf "%.1f", $4/1024/1024}')
push "system.disk_boot_free_gb" "$BOOT_FREE_GB" "Boot Disk Free" "GB"

# ── Jellyfin ─────────────────────────────────────────────────────────────────

# Active sessions
SESSIONS=$(curl -s "$JELLYFIN_URL/Sessions?api_key=$JELLYFIN_KEY" 2>/dev/null | python3 -c "import json,sys; d=json.load(sys.stdin); print(len([s for s in d if s.get('NowPlayingItem')]))" 2>/dev/null || echo "0")
push "jellyfin.active_streams" "$SESSIONS" "Jellyfin Active Streams" ""

# Total sessions (connected clients)
TOTAL_SESSIONS=$(curl -s "$JELLYFIN_URL/Sessions?api_key=$JELLYFIN_KEY" 2>/dev/null | python3 -c "import json,sys; print(len(json.load(sys.stdin)))" 2>/dev/null || echo "0")
push "jellyfin.connected_clients" "$TOTAL_SESSIONS" "Jellyfin Connected Clients" ""

# Library counts
COUNTS=$(curl -s "$JELLYFIN_URL/Items/Counts?api_key=$JELLYFIN_KEY" 2>/dev/null)
SONGS=$(echo "$COUNTS" | python3 -c "import json,sys; print(json.load(sys.stdin).get('SongCount',0))" 2>/dev/null || echo "0")
ALBUMS=$(echo "$COUNTS" | python3 -c "import json,sys; print(json.load(sys.stdin).get('AlbumCount',0))" 2>/dev/null || echo "0")
push "jellyfin.song_count" "$SONGS" "Jellyfin Songs" ""
push "jellyfin.album_count" "$ALBUMS" "Jellyfin Albums" ""

# ── Haven Relay Stats ────────────────────────────────────────────────────────

# nakabender relay — DB size in MB
NAKABENDER_DB_MB=$(du -sm /Volumes/External/nostr-relay/db/ 2>/dev/null | awk '{print $1}')
if [ -n "$NAKABENDER_DB_MB" ]; then
  push "relay.nakabender.db_size_mb" "$NAKABENDER_DB_MB" "nakabender.lol DB Size" "MB"
fi

# satsdisco relay — DB size in MB
SATSDISCO_DB_MB=$(du -sm /Volumes/External/nostr-relay-satsdisco/db/ 2>/dev/null | awk '{print $1}')
if [ -n "$SATSDISCO_DB_MB" ]; then
  push "relay.satsdisco.db_size_mb" "$SATSDISCO_DB_MB" "satsdisco relay DB Size" "MB"
fi

# nakabender — latest event count from log (most recent analysis line)
NAKABENDER_EVENTS=$(grep "totals" /Volumes/External/nostr-relay/haven.log 2>/dev/null | tail -1 | sed 's/.*pubkeys=\([0-9]*\).*/\1/' || echo "0")
if [ -n "$NAKABENDER_EVENTS" ] && [ "$NAKABENDER_EVENTS" != "0" ]; then
  push "relay.nakabender.pubkeys" "$NAKABENDER_EVENTS" "nakabender.lol Pubkeys" ""
fi

# satsdisco relay log
SATSDISCO_LOG="/Volumes/External/nostr-relay-satsdisco/haven.log"
SATSDISCO_EVENTS=$(grep "totals" "$SATSDISCO_LOG" 2>/dev/null | tail -1 | sed 's/.*pubkeys=\([0-9]*\).*/\1/' || echo "0")
if [ -n "$SATSDISCO_EVENTS" ] && [ "$SATSDISCO_EVENTS" != "0" ]; then
  push "relay.satsdisco.pubkeys" "$SATSDISCO_EVENTS" "satsdisco relay Pubkeys" ""
fi

# Samizdat relay DB size
SAMIZDAT_DB_MB=$(du -sm /Volumes/External/samizdat-relay/data/ 2>/dev/null | awk '{print $1}')
if [ -n "$SAMIZDAT_DB_MB" ]; then
  push "relay.samizdat.db_size_mb" "$SAMIZDAT_DB_MB" "samizdat relay DB Size" "MB"
fi

echo "$(date): collected cpu=$CPU% ram=$RAM_PCT% disk_ext=$EXT_USAGE% jellyfin_streams=$SESSIONS songs=$SONGS nakabender_db=${NAKABENDER_DB_MB}MB satsdisco_db=${SATSDISCO_DB_MB}MB"

# ── GitHub Repo Stats (all satsdisco public repos, auto-discovered) ──────────

GH_TOKEN=$(gh auth token 2>/dev/null)

# Fetch all public repos for satsdisco (up to 100)
REPOS=$(curl -s -H "Authorization: Bearer $GH_TOKEN" \
  "https://api.github.com/users/satsdisco/repos?type=public&per_page=100&sort=updated" 2>/dev/null \
  | python3 -c "import json,sys; repos=json.load(sys.stdin); print('\n'.join(r['full_name'] for r in repos))" 2>/dev/null)

for repo in $REPOS; do
  slug=$(echo "$repo" | tr '/' '.')
  result=$(curl -s -H "Authorization: Bearer $GH_TOKEN" "https://api.github.com/repos/$repo" 2>/dev/null)
  stars=$(echo "$result" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('stargazers_count',0))" 2>/dev/null || echo "0")
  issues=$(echo "$result" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('open_issues_count',0))" 2>/dev/null || echo "0")
  forks=$(echo "$result" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('forks_count',0))" 2>/dev/null || echo "0")
  name=$(echo "$repo" | cut -d'/' -f2)
  push "github.${slug}.stars" "$stars" "${name} Stars" "⭐"
  push "github.${slug}.issues" "$issues" "${name} Open Issues" ""
  push "github.${slug}.forks" "$forks" "${name} Forks" ""
done

# ── Vercel Deploy Stats ─────────────────────────────────────────────────────────

VT=$(cat ~/Library/Application\ Support/com.vercel.cli/auth.json 2>/dev/null | python3 -c "import json,sys; print(json.load(sys.stdin)['token'])" 2>/dev/null)
if [ -n "$VT" ]; then
  python3 << PYEOF
import json, urllib.request, sys, os

VT = "$VT"
INGEST = os.environ.get("NUMBRS_INGEST", "")
NUMBRS_KEY = os.environ.get("NUMBRS_API_KEY", "")
TEAM = "team_vUSmyYIKj6RowEoobVetZiko"

projects = {
  "numbrs": "prj_ys5D6hiHDAlqh6IsOBganASe0yOE",
  "samizdat": "prj_UcnPLotPNpNYs4aOqs7HXJdOW2ZD",
  "videorelay": "prj_uCPl6Hd6H6BUw7qlkjdRS60TG0a7",
  "jellyamp-pwa": "prj_OkALZFQVA8VYbI8kHaZ5GQ3hhsAt",
  "jellyamp-site": "prj_P6ifC0wB95uV4mGx6Th2wkNdseVQ",
  "hacek": "prj_aGMM1vTS7ucASD1q77lsQY2F3Bkt",
}

def push(key, value, name, unit=""):
    data = json.dumps({"key": key, "value": value, "name": name, "unit": unit}).encode()
    req = urllib.request.Request(INGEST, data=data, headers={"x-api-key": NUMBRS_KEY, "Content-Type": "application/json"})
    try: urllib.request.urlopen(req, timeout=5)
    except: pass

for name, proj_id in projects.items():
    url = f"https://api.vercel.com/v6/deployments?projectId={proj_id}&teamId={TEAM}&limit=20&target=production&state=READY"
    req = urllib.request.Request(url, headers={"Authorization": f"Bearer {VT}"})
    try:
        resp = urllib.request.urlopen(req, timeout=10)
        d = json.loads(resp.read())
        deps = d.get("deployments", [])
        count = len(deps)
        build_times = [(x["ready"] - x["buildingAt"]) / 1000 for x in deps if x.get("buildingAt") and x.get("ready")]
        avg_build = int(sum(build_times) / len(build_times)) if build_times else 0
        push(f"deploy.{name}.count", count, f"{name} Deploys", "deploys")
        push(f"build.{name}.duration_ms", avg_build * 1000, f"{name} Avg Build Time", "ms")
    except: pass
PYEOF
fi

# ── Bitcoin Price (Coinbase, no auth) ─────────────────────────────────────────
BTC_PRICE=$(curl -s "https://api.coinbase.com/v2/prices/BTC-USD/spot" | python3 -c "import json,sys; print(round(float(json.load(sys.stdin)['data']['amount'])))" 2>/dev/null)
[ -n "$BTC_PRICE" ] && push "bitcoin.price_usd" "$BTC_PRICE" "Bitcoin Price" "USD"

# ── GitHub Commit Counts (last 30 days) ───────────────────────────────────────
GH_TOKEN=$(gh auth token 2>/dev/null)
SINCE=$(python3 -c "from datetime import datetime,timedelta; print((datetime.utcnow()-timedelta(days=30)).strftime('%Y-%m-%dT%H:%M:%SZ'))")

for repo in "satsdisco/videorelay" "satsdisco/samizdat" "satsdisco/numbrs" "satsdisco/meshngr"; do
  slug=$(echo "$repo" | tr '/' '.')
  name=$(echo "$repo" | cut -d'/' -f2)
  count=$(curl -s -H "Authorization: Bearer $GH_TOKEN" \
    "https://api.github.com/repos/$repo/commits?per_page=100&since=$SINCE" \
    | python3 -c "import json,sys; d=json.load(sys.stdin); print(len(d) if isinstance(d,list) else 0)" 2>/dev/null || echo 0)
  push "github.${slug}.commits_30d" "$count" "${name} Commits (30d)" "commits"
done

# ── Nostr Follower Counts (via WebSocket relay query) ────────────────────────
python3 << 'NOSTR_WS'
import websocket, json, threading, urllib.request, os

BENDER_HEX = "e1832d86685f04e32eb66062e1ba6e629d6d488c9c3a521311a436e034f7c28a"
SATSDISCO_HEX = "47276eb163fc54b3733930ab5cfd5fa94687a1953871a873ad4faee91e8a5f38"
RELAY = "wss://relay.damus.io"
INGEST = os.environ.get("NUMBRS_INGEST", "")
KEY = os.environ.get("NUMBRS_API_KEY", "")

def push(k, v, name):
    data = json.dumps({"key": k, "value": v, "name": name, "unit": ""}).encode()
    req = urllib.request.Request(INGEST, data=data, headers={"x-api-key": KEY, "Content-Type": "application/json"})
    try: urllib.request.urlopen(req, timeout=5)
    except: pass

results = {}

def count_followers(pubkey, name):
    count = 0
    done = threading.Event()
    def on_msg(ws, msg):
        nonlocal count
        d = json.loads(msg)
        if d[0] == "EVENT": count += 1
        elif d[0] == "EOSE": results[name] = count; done.set(); ws.close()
    def on_open(ws):
        ws.send(json.dumps(["REQ", f"f_{name}", {"kinds": [3], "#p": [pubkey], "limit": 2000}]))
    def on_err(ws, e): results[name] = count; done.set()
    ws = websocket.WebSocketApp(RELAY, on_open=on_open, on_message=on_msg, on_error=on_err)
    t = threading.Thread(target=lambda: ws.run_forever()); t.daemon = True; t.start()
    done.wait(timeout=12)
    if name not in results: results[name] = count

threads = [threading.Thread(target=count_followers, args=(BENDER_HEX, "bender")),
           threading.Thread(target=count_followers, args=(SATSDISCO_HEX, "satsdisco"))]
for t in threads: t.start()
for t in threads: t.join(timeout=15)

if "bender" in results: push("nostr.bender.followers", results["bender"], "Bender Nostr Followers")
if "satsdisco" in results: push("nostr.satsdisco.followers", results["satsdisco"], "satsdisco Nostr Followers")
NOSTR_WS


# ── Plex Media Server ─────────────────────────────────────────────────────────

PLEX_TOKEN="${PLEX_TOKEN:-}"
PLEX_URL="${PLEX_URL:-}"

# Active streams
PLEX_STREAMS=$(curl -s "$PLEX_URL/sessions?X-Plex-Token=$PLEX_TOKEN" -H "Accept: application/json" \
  | python3 -c "import json,sys; print(json.load(sys.stdin).get('MediaContainer',{}).get('size',0))" 2>/dev/null || echo "0")
push "plex.active_streams" "$PLEX_STREAMS" "Plex Active Streams" ""

# Library counts
python3 << PLEX_PY
import urllib.request, json, os

TOKEN = os.environ.get("PLEX_TOKEN", "")
URL = os.environ.get("PLEX_URL", "")
INGEST = os.environ.get("NUMBRS_INGEST", "")
KEY = os.environ.get("NUMBRS_API_KEY", "")

def push(k, v, name, unit=""):
    data = json.dumps({"key": k, "value": v, "name": name, "unit": unit}).encode()
    req = urllib.request.Request(INGEST, data=data, headers={"x-api-key": KEY, "Content-Type": "application/json"})
    try: urllib.request.urlopen(req, timeout=5)
    except: pass

req = urllib.request.Request(f"{URL}/library/sections?X-Plex-Token={TOKEN}", headers={"Accept": "application/json"})
try:
    d = json.loads(urllib.request.urlopen(req, timeout=10).read())
    for section in d.get("MediaContainer", {}).get("Directory", []):
        skey = section.get("key")
        title = section.get("title", "").lower().replace(" ", "_")
        req2 = urllib.request.Request(
            f"{URL}/library/sections/{skey}/all?X-Plex-Token={TOKEN}&X-Plex-Container-Size=0&X-Plex-Container-Start=0",
            headers={"Accept": "application/json"}
        )
        d2 = json.loads(urllib.request.urlopen(req2, timeout=10).read())
        count = d2.get("MediaContainer", {}).get("totalSize", 0)
        push(f"plex.library.{title}.count", count, f"Plex {section.get('title')} Count", "items")
except Exception as e:
    pass
PLEX_PY


# ── Jellyfin Play History Sync (via Users Items API) ────────────────────────────

export SB_KEY_JELLY="$NUMBRS_SUPABASE_SERVICE_KEY"
python3 << 'JELLY_PY'
import urllib.request, json, os
from datetime import datetime, timedelta, timezone

JURL = os.environ.get("JELLYFIN_URL", "http://localhost:8096")
JKEY = os.environ.get("JELLYFIN_KEY", "")
SB_KEY = os.environ.get("SB_KEY_JELLY") or os.environ.get("NUMBRS_SUPABASE_SERVICE_KEY", "")
SB_URL = os.environ.get("NUMBRS_SUPABASE_URL", "")
OWNER_ID = os.environ.get("NUMBRS_OWNER_ID", "")

def fetch_j(path):
    req = urllib.request.Request(f"{JURL}{path}", headers={"X-Emby-Token": JKEY})
    try: return json.loads(urllib.request.urlopen(req, timeout=8).read())
    except: return {}

def push_events(rows):
    # Insert one at a time, skip on conflict (unique constraint on user_id_jellyfin, content, date_played)
    ok = 0
    for row in rows:
        data = json.dumps(row).encode()
        req = urllib.request.Request(f"{SB_URL}/rest/v1/jellyfin_events", data=data,
            headers={"apikey": SB_KEY, "Authorization": f"Bearer {SB_KEY}",
                     "Content-Type": "application/json", "Prefer": "return=minimal"})
        try:
            urllib.request.urlopen(req)
            ok += 1
        except urllib.error.HTTPError as e:
            if e.code != 409:  # 409 = already exists, skip silently
                print(f"Push error {e.code}: {e}")
        except Exception as e:
            print(f"Push error: {e}")
    return ok

# Cutoff: only sync plays from last 6 hours
since = (datetime.now(timezone.utc) - timedelta(hours=6)).isoformat() + "Z"

# Get all Jellyfin users
users = fetch_j("/Users")
rows = []

for user in users:
    uid = user.get("Id", "")
    uname = user.get("Name", "Unknown")

    # Fetch recently played items (audio + video)
    for item_type in ["Audio", "Movie", "Episode"]:
        items = fetch_j(
            f"/Users/{uid}/Items?SortBy=DatePlayed&SortOrder=Descending"
            f"&Limit=50&Recursive=true&IncludeItemTypes={item_type}"
            f"&Fields=DateLastMediaAdded&api_key={JKEY}"
        )
        for item in items.get("Items", []):
            user_data = item.get("UserData", {})
            last_played = user_data.get("LastPlayedDate")
            if not last_played or last_played < since:
                continue  # Skip old plays

            artists = item.get("Artists", [])
            artist = ", ".join(artists) if artists else item.get("AlbumArtist", "")
            title = item.get("Name", "Unknown")
            content = f"{artist} - {title}" if artist else title
            media_type = "audio" if item_type == "Audio" else "video"

            rows.append({
                "owner_id": OWNER_ID,
                "event_type": "stop",
                "username": uname,
                "user_id_jellyfin": uid,
                "content": content,
                "parsed_artist": artist or None,
                "parsed_title": title,
                "media_type": media_type,
                "jellyfin_item_id": item.get("Id"),
                "date_played": last_played,
            })

if rows:
    # Deduplicate by jellyfin_item_id + date_played (avoid double-counting)
    seen = set()
    unique = []
    for r in rows:
        key = f"{r['jellyfin_item_id']}_{r['date_played']}"
        if key not in seen:
            seen.add(key)
            unique.append(r)
    pushed = push_events(unique)
    print(f"Synced {pushed} new jellyfin plays ({len(unique)} found, skipped {len(unique)-pushed} existing)")
else:
    print("No new jellyfin plays")
JELLY_PY


# ============================================================
# CLAUDE USAGE — parse ~/.claude/projects JSONL sessions
# ============================================================
export SB_KEY_CLAUDE="$NUMBRS_SUPABASE_SERVICE_KEY"

python3 << 'PYEOF'
import json, os, glob, urllib.request
from datetime import datetime, timezone, timedelta

PROJECTS_DIR = os.path.expanduser("~/.claude/projects")
SB_URL = os.environ.get("NUMBRS_SUPABASE_URL", "")
SB_KEY = os.environ.get("SB_KEY_CLAUDE", os.environ.get("NUMBRS_SUPABASE_SERVICE_KEY", ""))
OWNER_ID = os.environ.get("NUMBRS_OWNER_ID", "")

def project_name(dir_name):
    n = dir_name
    n = n.replace("-Users-savetherobot--openclaw-workspace-", "")
    n = n.replace("-Users-savetherobot--openclaw-workspace", "workspace")
    n = n.replace("-Users-savetherobot-openclaw-", "")
    n = n.replace("-Users-savetherobot", "workspace")
    n = n.replace("-private-tmp-", "")
    return n.strip("-") or "workspace"

# Only process sessions modified in the last 2 hours
cutoff = (datetime.now() - timedelta(hours=2)).timestamp()
ok = new = 0

for project_dir in glob.glob(f"{PROJECTS_DIR}/*/"):
    proj_name = project_name(os.path.basename(project_dir.rstrip("/")))
    for jsonl in glob.glob(f"{project_dir}/*.jsonl"):
        if os.path.getmtime(jsonl) < cutoff:
            continue
        session_id = os.path.basename(jsonl).replace(".jsonl", "")
        stats = {"session_id": session_id, "project": proj_name, "project_path": project_dir.rstrip("/"),
                 "messages": 0, "tool_calls": 0, "input_tokens": 0, "output_tokens": 0,
                 "cache_read_tokens": 0, "cache_write_tokens": 0, "model": None, "date": None, "owner_id": OWNER_ID}
        try:
            with open(jsonl) as f:
                for line in f:
                    try:
                        d = json.loads(line)
                        if not stats["date"] and d.get("timestamp"):
                            stats["date"] = d["timestamp"][:10]
                        if d.get("type") == "assistant":
                            msg = d.get("message", {})
                            usage = msg.get("usage", {})
                            if usage:
                                stats["messages"] += 1
                                stats["input_tokens"] += usage.get("input_tokens", 0)
                                stats["output_tokens"] += usage.get("output_tokens", 0)
                                stats["cache_read_tokens"] += usage.get("cache_read_input_tokens", 0)
                                stats["cache_write_tokens"] += usage.get("cache_creation_input_tokens", 0)
                                if not stats["model"] and msg.get("model"):
                                    stats["model"] = msg["model"]
                        elif d.get("type") == "user":
                            content = d.get("message", {}).get("content", [])
                            if isinstance(content, list):
                                for item in content:
                                    if isinstance(item, dict) and item.get("type") == "tool_result":
                                        stats["tool_calls"] += 1
                    except: pass
        except: pass
        if stats["messages"] > 0 and stats["date"]:
            data = json.dumps(stats).encode()
            req = urllib.request.Request(f"{SB_URL}/rest/v1/claude_usage", data=data,
                headers={"apikey": SB_KEY, "Authorization": f"Bearer {SB_KEY}",
                         "Content-Type": "application/json", "Prefer": "return=minimal,resolution=merge-duplicates"})
            try:
                urllib.request.urlopen(req)
                ok += 1
            except: pass

print(f"Claude usage: synced {ok} sessions")
PYEOF

# ============================================================
# OPENCLAW USAGE — parse ~/.openclaw/agents/main/sessions
# ============================================================
python3 << 'PYEOF'
import json, os, glob, urllib.request
from collections import defaultdict
from datetime import datetime, timedelta

SB_URL = os.environ.get("NUMBRS_SUPABASE_URL", "")
SB_KEY = os.environ.get("NUMBRS_SUPABASE_SERVICE_KEY", "")
OWNER_ID = os.environ.get("NUMBRS_OWNER_ID", "")
SESSIONS_DIR = os.path.expanduser("~/.openclaw/agents/main/sessions")
cutoff = (datetime.now() - timedelta(hours=2)).timestamp()

def channel_map():
    mapping = {}
    try:
        data = json.load(open(f"{SESSIONS_DIR}/sessions.json"))
        for key, val in data.items():
            if isinstance(val, dict) and val.get("sessionId"):
                sid = val["sessionId"]
                # Use displayName or label if available, else derive from key
                ch = val.get("displayName") or val.get("label") or key.replace("agent:main:", "")
                mapping[sid] = ch
            elif isinstance(val, list):
                ch = key.replace("agent:main:", "")
                for s in val:
                    if isinstance(s, dict) and s.get("sessionId"):
                        mapping[s["sessionId"]] = s.get("displayName") or ch
    except: pass
    return mapping

ch_map = channel_map()
ok = 0

for jsonl in glob.glob(f"{SESSIONS_DIR}/*.jsonl"):
    if os.path.getmtime(jsonl) < cutoff:
        continue
    session_id = os.path.basename(jsonl).replace(".jsonl", "")
    stats = {"session_id": session_id, "channel": ch_map.get(session_id, "main"),
             "messages": 0, "input_tokens": 0, "output_tokens": 0,
             "cache_read_tokens": 0, "cache_write_tokens": 0,
             "cost_usd": 0.0, "date": None, "owner_id": OWNER_ID}
    model_tokens = defaultdict(int)

    with open(jsonl) as f:
        for line in f:
            try:
                d = json.loads(line)
                if d.get("type") != "message": continue
                msg = d.get("message", {})
                if msg.get("role") != "assistant": continue
                usage = msg.get("usage", {})
                if not usage: continue
                model = msg.get("model", "")
                if model == "delivery-mirror": continue
                cost = usage.get("cost", {})
                if not stats["date"] and d.get("timestamp"):
                    stats["date"] = d["timestamp"][:10]
                    # session_started_at not in schema — skip
                m = model.replace("-20250514","").replace("-20241022","") if model else "unknown"
                model_tokens[m] += usage.get("output", 0)
                stats["messages"] += 1
                stats["input_tokens"] += usage.get("input", 0)
                stats["output_tokens"] += usage.get("output", 0)
                stats["cache_read_tokens"] += usage.get("cacheRead", 0)
                stats["cache_write_tokens"] += usage.get("cacheWrite", 0)
                stats["cost_usd"] += cost.get("total", 0)
            except: pass

    if model_tokens:
        stats["model"] = max(model_tokens, key=model_tokens.get)
    else:
        stats["model"] = "unknown"

    if stats["messages"] > 0 and stats["date"]:
        update = {k: v for k, v in stats.items() if k not in ("session_id","owner_id")}
        data = json.dumps(update).encode()
        url = f"{SB_URL}/rest/v1/openclaw_usage?session_id=eq.{session_id}&owner_id=eq.{OWNER_ID}"
        req = urllib.request.Request(url, data=data, method="PATCH",
            headers={"apikey": SB_KEY, "Authorization": f"Bearer {SB_KEY}",
                     "Content-Type": "application/json", "Prefer": "return=minimal"})
        try:
            urllib.request.urlopen(req)
            ok += 1
        except:
            # New session — insert
            insert_data = json.dumps(stats).encode()
            ireq = urllib.request.Request(f"{SB_URL}/rest/v1/openclaw_usage", data=insert_data,
                headers={"apikey": SB_KEY, "Authorization": f"Bearer {SB_KEY}",
                         "Content-Type": "application/json", "Prefer": "return=minimal"})
            try:
                urllib.request.urlopen(ireq)
                ok += 1
            except: pass

print(f"OpenClaw usage: synced {ok} sessions")
PYEOF
