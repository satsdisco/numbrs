# numbrs Roadmap

> **The pitch:** Grafana for the individual. Beautiful, opinionated, Bitcoin-native. Monitor everything you run from one place.

numbrs started as a Nostr relay health monitor. It's becoming the **personal infrastructure dashboard** for sovereignty-minded individuals.

Every sovereign individual runs their own stack — nodes, miners, media servers, relays. numbrs is the single pane of glass for all of it.

---

## ✅ Shipped

### Core Platform
- Relay health monitoring (WebSocket latency, event latency, uptime)
- Custom metric ingestion via HTTP API (single + batch)
- Dashboard builder (drag-and-drop grid, line/area/stat/gauge panels)
- Dashboard theme customiser (8 presets, CSS variables)
- Public dashboard sharing (read-only links)
- Dashboard templates (Relay Overview, Network Health, Zap Economy, Protocol Analytics, Vercel)
- API key management + full REST API with interactive OpenAPI docs
- Auth (email/password + Nostr NIP-07)
- Settings page (appearance, notifications, account)

### Integrations
- Claude Code + OpenClaw usage tracking
- Jellyfin + Plex media dashboards
- Vercel deploy monitoring
- Integration marketplace with collector scripts

### Relay Monitoring
- Uptime monitoring with configurable time ranges
- Incidents timeline with duration + failed checks
- Health scores, volatility analysis, trend comparison
- Slack webhook alert delivery
- Public Relay Benchmarks (opt-in directory)
- Leaderboard with sort controls

---

## 🔨 Up Next

### Integration Framework
Standardised pattern for collectors, auto-discovery, dashboard templates, and configuration UI. The foundation for every integration below.

### Mining Dashboards
- **Bitaxe** — hashrate, temp, shares, best difficulty, efficiency
- **Braiins Mini Miner** — hashrate, pool stats, efficiency, temp

### Explore Page v2
Multi-user relay directory with search by region, performance, and supported NIPs.

---

## 🗺️ Later

### More Integrations
- Sonos / smart home (now playing, rooms, volume)
- Lightning node stats (LND/CLN channels, routing fees, capacity)
- Bitcoin node (block height, mempool, peers, sync status)
- Pi-hole / DNS stats (queries, blocked %, top domains)
- Network health (ping, bandwidth, ISP monitoring)
- NAS / storage (disk usage, SMART health, backup status)
- Start9 / Umbrel service status

### Platform
- Community theme sharing
- NIP-66 relay monitoring events
- More webhook targets (Discord, Telegram, ntfy)
- Multi-user / team dashboards
- Self-hosted option

---

## Design Principles

1. **Your data, your dashboard** — no telemetry, no tracking, no cloud lock-in
2. **Beautiful by default** — opinionated design that looks good out of the box
3. **Sovereignty-first** — built for people who run their own infrastructure
4. **Bitcoin-native** — sats, not dollars. Lightning, not Stripe.
5. **AI-friendly** — REST API, OpenAPI docs, AGENTS.md. Agents can build dashboards autonomously.

---

Track progress: [GitHub Issues](https://github.com/satsdisco/numbrs/issues)
