export type IntegrationType = "server-side" | "collector" | "manual";
export type Difficulty = "easy" | "medium" | "advanced";
export type SetupType = "one-click" | "api-key" | "script" | "code";

export interface CatalogMetric {
  key: string;
  name: string;
  unit: string;
  description: string;
}

export interface CatalogIntegration {
  id: string;
  name: string;
  icon: string;
  /** Category ID — matches CATALOG_CATEGORIES keys */
  category: string;
  description: string;
  type: IntegrationType;
  metrics: CatalogMetric[];
  difficulty: Difficulty;
  setupType: SetupType;
  docsUrl?: string;
  requiresApiKey: boolean;
  free: boolean;
}

export interface CatalogCategory {
  id: string;
  label: string;
  icon: string;
}

// ─── Categories ────────────────────────────────────────────────────────────────

export const CATALOG_CATEGORIES: CatalogCategory[] = [
  { id: "all", label: "All", icon: "✦" },
  { id: "bitcoin", label: "Bitcoin & Lightning", icon: "₿" },
  { id: "weather", label: "Weather & Environment", icon: "🌤️" },
  { id: "finance", label: "Finance & Markets", icon: "📈" },
  { id: "developer", label: "Developer", icon: "🐙" },
  { id: "infrastructure", label: "Infrastructure", icon: "🖥️" },
  { id: "media", label: "Media & Social", icon: "🎵" },
  { id: "productivity", label: "Productivity", icon: "📅" },
  { id: "fun", label: "Fun & Novelty", icon: "🎲" },
];

// ─── Catalog ───────────────────────────────────────────────────────────────────

export const INTEGRATION_CATALOG: CatalogIntegration[] = [
  // ── Bitcoin & Lightning ──────────────────────────────────────────────────────

  {
    id: "bitcoin",
    name: "Bitcoin Price",
    icon: "₿",
    category: "bitcoin",
    description: "Live BTC/USD spot price via Coinbase. No config needed.",
    type: "server-side",
    difficulty: "easy",
    setupType: "one-click",
    requiresApiKey: false,
    free: true,
    metrics: [
      { key: "bitcoin.price_usd", name: "BTC Price (USD)", unit: "USD", description: "Current BTC/USD spot price from Coinbase" },
    ],
  },
  {
    id: "mempool",
    name: "Mempool.space",
    icon: "⛓️",
    category: "bitcoin",
    description: "Bitcoin fee rates, hashrate, difficulty, block height, and mempool stats from mempool.space.",
    type: "server-side",
    difficulty: "easy",
    setupType: "one-click",
    requiresApiKey: false,
    free: true,
    metrics: [
      { key: "mempool.fees.fastest", name: "Fastest Fee", unit: "sat/vB", description: "Next-block fee rate" },
      { key: "mempool.fees.hour", name: "1-Hour Fee", unit: "sat/vB", description: "Fee rate for ~1h confirmation" },
      { key: "mempool.fees.economy", name: "Economy Fee", unit: "sat/vB", description: "Low-priority fee rate" },
      { key: "mempool.hashrate", name: "Hashrate", unit: "EH/s", description: "Current network hashrate" },
      { key: "mempool.difficulty", name: "Difficulty", unit: "", description: "Current mining difficulty" },
      { key: "mempool.block_height", name: "Block Height", unit: "blocks", description: "Latest block height" },
      { key: "mempool.tx_count", name: "Mempool TX Count", unit: "txs", description: "Unconfirmed transactions in mempool" },
      { key: "mempool.vsize", name: "Mempool vSize", unit: "vB", description: "Total mempool size in virtual bytes" },
    ],
  },
  {
    id: "bisq",
    name: "Bisq DEX",
    icon: "🔄",
    category: "bitcoin",
    description: "Trade volume and offer counts from the Bisq decentralised exchange.",
    type: "collector",
    difficulty: "medium",
    setupType: "script",
    requiresApiKey: false,
    free: true,
    metrics: [
      { key: "bisq.volume_btc", name: "Volume (BTC)", unit: "BTC", description: "Daily trade volume" },
      { key: "bisq.trade_count", name: "Trade Count", unit: "trades", description: "Number of completed trades" },
    ],
  },

  // ── Weather & Environment ────────────────────────────────────────────────────

  {
    id: "weather",
    name: "Open-Meteo Weather",
    icon: "🌤️",
    category: "weather",
    description: "Temperature, humidity, rain, snow, UV index, and wind via Open-Meteo. Free, no API key needed.",
    type: "server-side",
    difficulty: "easy",
    setupType: "api-key",
    requiresApiKey: false,
    free: true,
    metrics: [
      { key: "weather.{location}.temperature", name: "Temperature", unit: "°C", description: "Current air temperature" },
      { key: "weather.{location}.humidity", name: "Humidity", unit: "%", description: "Relative humidity" },
      { key: "weather.{location}.precipitation", name: "Precipitation", unit: "mm", description: "Current precipitation" },
      { key: "weather.{location}.rain", name: "Rain", unit: "mm", description: "Rain amount" },
      { key: "weather.{location}.snowfall", name: "Snowfall", unit: "cm", description: "Snowfall amount" },
      { key: "weather.{location}.wind_speed", name: "Wind Speed", unit: "km/h", description: "Wind speed at 10m" },
      { key: "weather.{location}.uv_index", name: "UV Index", unit: "", description: "UV index" },
    ],
  },
  {
    id: "air-quality",
    name: "Air Quality",
    icon: "💨",
    category: "weather",
    description: "AQI, PM2.5, PM10, and ozone readings from Open-Meteo air quality.",
    type: "collector",
    difficulty: "medium",
    setupType: "script",
    requiresApiKey: false,
    free: true,
    metrics: [
      { key: "air.aqi", name: "AQI", unit: "", description: "Air Quality Index" },
      { key: "air.pm2_5", name: "PM2.5", unit: "μg/m³", description: "Fine particulate matter" },
    ],
  },

  // ── Finance & Markets ────────────────────────────────────────────────────────

  {
    id: "coingecko",
    name: "CoinGecko",
    icon: "🦎",
    category: "finance",
    description: "Global crypto market stats — BTC dominance, total market cap, 24h volume. No API key needed.",
    type: "server-side",
    difficulty: "easy",
    setupType: "one-click",
    requiresApiKey: false,
    free: true,
    metrics: [
      { key: "coingecko.btc_dominance",         name: "BTC Dominance",           unit: "%",   description: "Bitcoin share of total market cap" },
      { key: "coingecko.total_market_cap_usd",   name: "Total Market Cap",        unit: "USD", description: "Combined market cap of all cryptocurrencies" },
      { key: "coingecko.total_volume_24h",        name: "24h Volume",              unit: "USD", description: "Total 24h trading volume across all markets" },
      { key: "coingecko.active_cryptocurrencies", name: "Active Cryptocurrencies", unit: "",    description: "Number of active cryptocurrencies tracked" },
    ],
  },
  {
    id: "fred",
    name: "FRED (M2 / CPI)",
    icon: "🏛️",
    category: "finance",
    description: "US M2 money supply, CPI, and Fed funds rate from the Federal Reserve FRED API. Free key required.",
    type: "server-side",
    difficulty: "medium",
    setupType: "api-key",
    requiresApiKey: true,
    free: true,
    metrics: [
      { key: "fred.m2_money_supply", name: "M2 Money Supply", unit: "$B", description: "US M2 money supply in billions (M2SL series)" },
      { key: "fred.cpi",             name: "CPI",             unit: "",   description: "Consumer Price Index for All Urban Consumers (CPIAUCSL)" },
      { key: "fred.fed_funds_rate",  name: "Fed Funds Rate",  unit: "%",  description: "Effective federal funds rate (FEDFUNDS)" },
    ],
  },

  // ── Developer ────────────────────────────────────────────────────────────────

  {
    id: "github",
    name: "GitHub Stats",
    icon: "🐙",
    category: "developer",
    description: "Stars, forks, and open issues across your public repositories.",
    type: "server-side",
    difficulty: "easy",
    setupType: "api-key",
    requiresApiKey: false,
    free: true,
    metrics: [
      { key: "github.{repo}.stars", name: "Stars", unit: "⭐", description: "Repository star count" },
      { key: "github.{repo}.forks", name: "Forks", unit: "", description: "Fork count" },
      { key: "github.{repo}.issues", name: "Open Issues", unit: "", description: "Open issue count" },
    ],
  },
  {
    id: "vercel",
    name: "Vercel",
    icon: "▲",
    category: "developer",
    description: "Deployment counts, build durations, and error rates from your Vercel projects.",
    type: "server-side",
    difficulty: "easy",
    setupType: "api-key",
    requiresApiKey: true,
    free: true,
    metrics: [
      { key: "vercel.deploys", name: "Deploys", unit: "deploys", description: "Deployment count" },
      { key: "vercel.build_ms", name: "Build Duration", unit: "ms", description: "Average build time" },
    ],
  },
  {
    id: "wakatime",
    name: "WakaTime",
    icon: "⏱️",
    category: "developer",
    description: "Coding time, languages, and project breakdown from WakaTime.",
    type: "collector",
    difficulty: "easy",
    setupType: "api-key",
    requiresApiKey: true,
    free: true,
    metrics: [
      { key: "wakatime.coding_seconds", name: "Coding Time", unit: "s", description: "Total coding time in seconds" },
      { key: "wakatime.languages.{lang}", name: "Language Time", unit: "s", description: "Time per language" },
    ],
  },
  {
    id: "http-api",
    name: "HTTP API",
    icon: "🌐",
    category: "developer",
    description: "Push metrics from any language or tool with a simple POST request.",
    type: "manual",
    difficulty: "easy",
    setupType: "code",
    requiresApiKey: true,
    free: true,
    metrics: [],
  },
  {
    id: "github-actions",
    name: "GitHub Actions",
    icon: "⚙️",
    category: "developer",
    description: "Track deploys, test runs, and build metrics in your CI/CD pipeline.",
    type: "manual",
    difficulty: "easy",
    setupType: "code",
    requiresApiKey: true,
    free: true,
    metrics: [],
  },

  // ── Infrastructure ───────────────────────────────────────────────────────────

  {
    id: "bash",
    name: "Bash / Cron",
    icon: "🐚",
    category: "infrastructure",
    description: "Track server metrics from a cron job or shell script.",
    type: "manual",
    difficulty: "easy",
    setupType: "script",
    requiresApiKey: true,
    free: true,
    metrics: [],
  },
  {
    id: "docker",
    name: "Docker Stats",
    icon: "🐳",
    category: "infrastructure",
    description: "Container CPU, memory, and network I/O via docker stats.",
    type: "collector",
    difficulty: "medium",
    setupType: "script",
    requiresApiKey: false,
    free: true,
    metrics: [
      { key: "docker.{container}.cpu_pct", name: "CPU %", unit: "%", description: "Container CPU usage" },
      { key: "docker.{container}.mem_mb", name: "Memory", unit: "MB", description: "Container memory usage" },
    ],
  },
  {
    id: "speedtest",
    name: "Speedtest",
    icon: "🚀",
    category: "infrastructure",
    description: "Periodic internet speed tests via Ookla Speedtest CLI or speedtest-cli. Run every 30 min.",
    type: "collector",
    difficulty: "medium",
    setupType: "script",
    requiresApiKey: false,
    free: true,
    metrics: [
      { key: "speedtest.download_mbps", name: "Download",  unit: "Mbps", description: "Download speed in Mbps" },
      { key: "speedtest.upload_mbps",   name: "Upload",    unit: "Mbps", description: "Upload speed in Mbps" },
      { key: "speedtest.ping_ms",       name: "Ping",      unit: "ms",   description: "Latency to speedtest server" },
      { key: "speedtest.jitter_ms",     name: "Jitter",    unit: "ms",   description: "Ping jitter (Ookla CLI only)" },
    ],
  },
  {
    id: "pihole",
    name: "Pi-hole",
    icon: "🛡️",
    category: "infrastructure",
    description: "DNS query counts, blocked counts, and blocklist size from your Pi-hole ad blocker.",
    type: "collector",
    difficulty: "medium",
    setupType: "script",
    requiresApiKey: false,
    free: true,
    metrics: [
      { key: "pihole.queries_today",        name: "Queries Today",        unit: "queries", description: "Total DNS queries processed today" },
      { key: "pihole.blocked_today",        name: "Blocked Today",        unit: "queries", description: "DNS queries blocked today" },
      { key: "pihole.blocked_pct",          name: "Blocked %",            unit: "%",       description: "Percentage of queries blocked today" },
      { key: "pihole.domains_on_blocklist", name: "Domains on Blocklist", unit: "domains", description: "Total domains in the blocklist" },
    ],
  },

  // ── Media & Social ───────────────────────────────────────────────────────────

  {
    id: "lastfm",
    name: "Last.fm",
    icon: "🎵",
    category: "media",
    description: "Scrobble counts, top artists, and listening streaks from Last.fm.",
    type: "collector",
    difficulty: "easy",
    setupType: "api-key",
    requiresApiKey: true,
    free: true,
    metrics: [
      { key: "lastfm.scrobbles_today", name: "Scrobbles Today", unit: "scrobbles", description: "Tracks scrobbled today" },
      { key: "lastfm.scrobbles_total", name: "Total Scrobbles", unit: "scrobbles", description: "All-time scrobble count" },
    ],
  },
  {
    id: "listenbrainz",
    name: "ListenBrainz",
    icon: "🎧",
    category: "media",
    description: "Total listens, today's listens, and weekly listening activity from ListenBrainz. No API key needed for public data.",
    type: "collector",
    difficulty: "easy",
    setupType: "script",
    requiresApiKey: false,
    free: true,
    metrics: [
      { key: "listenbrainz.total_listens",    name: "Total Listens",    unit: "listens", description: "All-time listen count for your account" },
      { key: "listenbrainz.listens_today",    name: "Listens Today",    unit: "listens", description: "Tracks listened to today" },
      { key: "listenbrainz.listens_this_week", name: "Listens This Week", unit: "listens", description: "Total listens in the current week" },
    ],
  },
  {
    id: "nostr",
    name: "Nostr Stats",
    icon: "⚡",
    category: "media",
    description: "Follower count, note count, and zap received for your Nostr npub.",
    type: "collector",
    difficulty: "medium",
    setupType: "script",
    requiresApiKey: false,
    free: true,
    metrics: [
      { key: "nostr.{npub}.followers", name: "Followers", unit: "followers", description: "Contact list follower count" },
      { key: "nostr.{npub}.notes", name: "Notes", unit: "notes", description: "Published note count" },
    ],
  },
  {
    id: "plex",
    name: "Plex",
    icon: "🎬",
    category: "media",
    description: "Active streams and library sizes from your Plex Media Server.",
    type: "collector",
    difficulty: "medium",
    setupType: "api-key",
    requiresApiKey: true,
    free: true,
    metrics: [
      { key: "plex.active_streams", name: "Active Streams", unit: "streams", description: "Currently active streams" },
      { key: "plex.library.movies.count", name: "Movies", unit: "titles", description: "Movie library count" },
    ],
  },
  {
    id: "jellyfin",
    name: "Jellyfin",
    icon: "🎞️",
    category: "media",
    description: "Active sessions and library stats from your Jellyfin server.",
    type: "collector",
    difficulty: "medium",
    setupType: "api-key",
    requiresApiKey: true,
    free: true,
    metrics: [
      { key: "jellyfin.active_streams", name: "Active Streams", unit: "streams", description: "Currently active streams" },
      { key: "jellyfin.song_count", name: "Songs", unit: "songs", description: "Music library size" },
    ],
  },

  // ── Productivity ─────────────────────────────────────────────────────────────

  {
    id: "todoist",
    name: "Todoist",
    icon: "✅",
    category: "productivity",
    description: "Task completion rates, karma, and daily streak from Todoist.",
    type: "collector",
    difficulty: "easy",
    setupType: "api-key",
    requiresApiKey: true,
    free: true,
    metrics: [
      { key: "todoist.completed_today", name: "Tasks Completed Today", unit: "tasks", description: "Tasks completed today" },
      { key: "todoist.karma", name: "Karma", unit: "karma", description: "Todoist karma score" },
    ],
  },

  {
    id: "calendar",
    name: "Google Calendar",
    icon: "📅",
    category: "productivity",
    description: "Events today, events tomorrow, and hours until your next event via the gog CLI.",
    type: "collector",
    difficulty: "medium",
    setupType: "script",
    requiresApiKey: false,
    free: true,
    metrics: [
      { key: "calendar.events_today",    name: "Events Today",          unit: "events", description: "Number of calendar events today" },
      { key: "calendar.events_tomorrow", name: "Events Tomorrow",       unit: "events", description: "Number of calendar events tomorrow" },
      { key: "calendar.next_event_hours", name: "Hours Until Next Event", unit: "hours", description: "Hours until the next upcoming event today" },
    ],
  },

  // ── Fun & Novelty ─────────────────────────────────────────────────────────────

  {
    id: "iss",
    name: "ISS Tracker",
    icon: "🛸",
    category: "fun",
    description: "Real-time latitude, longitude, and altitude of the International Space Station.",
    type: "collector",
    difficulty: "easy",
    setupType: "script",
    requiresApiKey: false,
    free: true,
    metrics: [
      { key: "iss.latitude", name: "Latitude", unit: "°", description: "ISS current latitude" },
      { key: "iss.longitude", name: "Longitude", unit: "°", description: "ISS current longitude" },
      { key: "iss.altitude_km", name: "Altitude", unit: "km", description: "ISS altitude" },
    ],
  },
  {
    id: "earthquakes",
    name: "USGS Earthquakes",
    icon: "🌋",
    category: "fun",
    description: "Magnitude and count of recent earthquakes from the USGS feed.",
    type: "collector",
    difficulty: "easy",
    setupType: "script",
    requiresApiKey: false,
    free: true,
    metrics: [
      { key: "usgs.quake_count_24h", name: "Earthquakes (24h)", unit: "quakes", description: "Number of M1+ quakes in 24h" },
      { key: "usgs.max_magnitude_24h", name: "Max Magnitude (24h)", unit: "M", description: "Largest quake magnitude in 24h" },
    ],
  },
  {
    id: "day-length",
    name: "Day Length",
    icon: "☀️",
    category: "fun",
    description: "Hours of daylight for your location, tracked over time.",
    type: "collector",
    difficulty: "easy",
    setupType: "script",
    requiresApiKey: false,
    free: true,
    metrics: [
      { key: "daylight.hours", name: "Daylight Hours", unit: "hrs", description: "Hours of daylight today" },
    ],
  },
];

/** Look up a single integration by id */
export function getCatalogEntry(id: string): CatalogIntegration | undefined {
  return INTEGRATION_CATALOG.find((i) => i.id === id);
}

/** Get all integrations for a category */
export function getByCategory(categoryId: string): CatalogIntegration[] {
  if (categoryId === "all") return INTEGRATION_CATALOG;
  return INTEGRATION_CATALOG.filter((i) => i.category === categoryId);
}
