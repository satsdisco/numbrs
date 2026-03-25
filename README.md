# numbrs

Custom metrics dashboard and Nostr relay monitoring platform. Push any time-series data to numbrs via a simple HTTP API, visualize it on drag-and-drop dashboards, and monitor your Nostr relays for latency and uptime.

Live at [numbrs.lol](https://numbrs.lol).

---

## Features

- **Relay health monitoring** — probe WebSocket connect latency, event latency, and uptime for any Nostr relay
- **Custom metric ingestion** — push any numeric time-series via a single HTTP POST
- **Dashboard builder** — drag-and-drop grid with line charts, area charts, stat numbers, and gauge panels
- **Uptime monitoring** — HTTP endpoint checks with history and incident tracking
- **Alerts** — threshold-based notifications for relay metrics
- **Public sharing** — share any dashboard via a read-only link
- **Templates** — one-click dashboards for common setups (see below)
- **API key management** — generate and revoke ingest keys

---

## Tech Stack

| Layer | Tech |
|---|---|
| Frontend | React 18, TypeScript, Vite |
| Styling | Tailwind CSS, shadcn/ui (Radix UI) |
| Charts | Recharts |
| Animation | Framer Motion |
| Backend | Supabase (PostgreSQL, Auth, Edge Functions) |
| Auth | Email/password + Nostr NIP-07 signing |

---

## Pushing Custom Metrics

Send a `POST` to the ingest endpoint with your API key:

```sh
curl -X POST https://numbrs.lol/api/ingest \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d '{
    "metric": "system.cpu_pct",
    "value": 42.3
  }'
```

Multiple datapoints in one request:

```sh
curl -X POST https://numbrs.lol/api/ingest \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d '[
    { "metric": "system.cpu_pct", "value": 42.3 },
    { "metric": "system.ram_pct", "value": 71.1 },
    { "metric": "system.disk_boot_pct", "value": 58.0 }
  ]'
```

Metrics are created automatically on first push. Use dotted namespacing (`plex.library.movies.count`, `bitcoin.price_usd`, etc.) to keep things organized.

An example collector script that pushes system, Jellyfin, Plex, Bitcoin, and Nostr metrics is in [`scripts/numbrs-collector.sh`](scripts/numbrs-collector.sh).

---

## Dashboard Templates

| Template | Description |
|---|---|
| **Relay Overview** | Connect latency, event latency, uptime gauge for a single relay |
| **Network Health** | Network-wide throughput, active relay count, latency trends |
| **Zap Economy** | Lightning zap volumes, counts, and averages |
| **Protocol Analytics** | Event kind breakdowns, propagation time, NIP support score |
| **Vercel Site** | Deploy counts, build durations, error rates |
| **GitHub Project** | Stars, forks, open issues, PR velocity |
| **Uptime Overview** | Uptime %, latency, incident counts |
| **My Relays** | DB size and pubkey counts for self-hosted Haven relays |
| **Projects** | GitHub stars across multiple repos |
| **Mac Mini Health** | CPU, RAM, disk, Jellyfin streams and library stats |
| **Plex Media Server** | Active streams, library counts (movies/TV/music/audiobooks) |
| **Satsdisco Dashboard** | BTC price, Nostr followers, GitHub project stats |
| **Personal Stats** | Track anything — commits, workouts, habits |

---

## Local Development

```sh
git clone https://github.com/satsdisco/numbrs
cd numbrs
npm i
npm run dev
```

You'll need a Supabase project. Copy `.env.example` to `.env.local` and fill in:

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

Run migrations:

```sh
supabase db push
```

Deploy edge functions:

```sh
supabase functions deploy
```

---

## Screenshots

<!-- TODO: add screenshots -->

---

## License

MIT
