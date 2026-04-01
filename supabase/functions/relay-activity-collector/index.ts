import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SAMPLE_DURATION_MS = 30_000; // 30 seconds of sampling per relay
const SUBSCRIBE_KINDS = [0, 1, 3, 7, 9735, 30023];

interface RelayEvent {
  id: string;
  pubkey: string;
  kind: number;
  tags: string[][];
  content: string;
  created_at: number;
}

/** Extract sats from a bolt11 invoice string */
function parseBolt11Sats(bolt11: string): number {
  // bolt11 format: lnbc<amount><multiplier>1...
  const match = bolt11.match(/^lnbc(\d+)([munp]?)/i);
  if (!match) return 0;
  const num = parseInt(match[1], 10);
  const mult = match[2]?.toLowerCase() || "";
  switch (mult) {
    case "":
      return num * 100_000_000; // BTC to sats
    case "m":
      return num * 100_000; // mBTC to sats
    case "u":
      return num * 100; // μBTC to sats
    case "n":
      return Math.round(num * 0.1); // nBTC to sats
    case "p":
      return Math.round(num * 0.0001); // pBTC to sats
    default:
      return 0;
  }
}

/** Extract zap amount from a kind 9735 event */
function extractZapSats(event: RelayEvent): number {
  // Try bolt11 tag first
  const bolt11Tag = event.tags.find((t) => t[0] === "bolt11");
  if (bolt11Tag?.[1]) return parseBolt11Sats(bolt11Tag[1]);

  // Try description tag (contains the zap request with amount)
  const descTag = event.tags.find((t) => t[0] === "description");
  if (descTag?.[1]) {
    try {
      const zapReq = JSON.parse(descTag[1]);
      const amountTag = zapReq.tags?.find(
        (t: string[]) => t[0] === "amount"
      );
      if (amountTag?.[1]) return Math.round(parseInt(amountTag[1], 10) / 1000); // msats to sats
    } catch {
      // ignore parse errors
    }
  }

  return 0;
}

/** Sample events from a single relay for SAMPLE_DURATION_MS */
async function sampleRelay(
  wsUrl: string
): Promise<Map<number, { count: number; sats: number; pubkeys: Set<string> }>> {
  const stats = new Map<
    number,
    { count: number; sats: number; pubkeys: Set<string> }
  >();

  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      try {
        ws.close();
      } catch {
        /* ignore */
      }
      resolve(stats);
    }, SAMPLE_DURATION_MS);

    let ws: WebSocket;
    try {
      ws = new WebSocket(wsUrl);
    } catch {
      clearTimeout(timeout);
      resolve(stats);
      return;
    }

    const subId = `act-${Math.random().toString(36).slice(2, 8)}`;

    ws.onopen = () => {
      ws.send(
        JSON.stringify(["REQ", subId, { kinds: SUBSCRIBE_KINDS, limit: 0 }])
      );
    };

    ws.onmessage = (e: MessageEvent) => {
      try {
        const msg = JSON.parse(e.data as string);
        if (msg[0] !== "EVENT" || !msg[2]) return;
        const event = msg[2] as RelayEvent;

        if (!stats.has(event.kind)) {
          stats.set(event.kind, { count: 0, sats: 0, pubkeys: new Set() });
        }
        const s = stats.get(event.kind)!;
        s.count++;
        s.pubkeys.add(event.pubkey);

        if (event.kind === 9735) {
          s.sats += extractZapSats(event);
        }
      } catch {
        // ignore parse errors
      }
    };

    ws.onerror = () => {
      clearTimeout(timeout);
      resolve(stats);
    };

    ws.onclose = () => {
      clearTimeout(timeout);
      resolve(stats);
    };
  });
}

Deno.serve(async (req) => {
  // Verify this is an authorized call
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response("Unauthorized", { status: 401 });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceKey);

  // Get all relays
  const { data: relays, error: relaysError } = await supabase
    .from("relays")
    .select("id, url")
    .eq("is_active", true);

  if (relaysError || !relays) {
    return new Response(JSON.stringify({ error: relaysError?.message }), {
      status: 500,
    });
  }

  // Current hour bucket
  const now = new Date();
  now.setMinutes(0, 0, 0);
  const bucket = now.toISOString();

  const results: { relay: string; kinds: number; events: number }[] = [];

  // Sample relays in parallel (max 5 concurrent)
  const batchSize = 5;
  for (let i = 0; i < relays.length; i += batchSize) {
    const batch = relays.slice(i, i + batchSize);
    const batchResults = await Promise.allSettled(
      batch.map(async (relay) => {
        const stats = await sampleRelay(relay.url);

        // Upsert activity rows
        const rows = Array.from(stats.entries()).map(([kind, data]) => ({
          relay_id: relay.id,
          bucket,
          kind,
          event_count: data.count,
          total_sats: data.sats,
          unique_pubkeys: data.pubkeys.size,
        }));

        if (rows.length > 0) {
          const { error } = await supabase.from("relay_activity").upsert(rows, {
            onConflict: "relay_id,bucket,kind",
            ignoreDuplicates: false,
          });
          if (error) console.error(`Upsert error for ${relay.url}:`, error);
        }

        results.push({
          relay: relay.url,
          kinds: stats.size,
          events: Array.from(stats.values()).reduce((s, v) => s + v.count, 0),
        });
      })
    );

    // Log any failures
    batchResults.forEach((r, idx) => {
      if (r.status === "rejected") {
        console.error(`Failed to sample ${batch[idx].url}:`, r.reason);
      }
    });
  }

  return new Response(JSON.stringify({ sampled: results.length, results }), {
    headers: { "Content-Type": "application/json" },
  });
});
