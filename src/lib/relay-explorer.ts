import { npubEncode, noteEncode, neventEncode } from "nostr-tools/nip19";

export interface RelayInfo {
  name?: string;
  description?: string;
  pubkey?: string;
  contact?: string;
  supported_nips?: number[];
  software?: string;
  version?: string;
  limitation?: {
    max_message_length?: number;
    max_subscriptions?: number;
    max_filters?: number;
    max_limit?: number;
    max_event_tags?: number;
    max_content_length?: number;
    min_pow_difficulty?: number;
    auth_required?: boolean;
    payment_required?: boolean;
  };
}

export interface ExplorerEvent {
  id: string;
  pubkey: string;
  created_at: number;
  kind: number;
  tags: string[][];
  content: string;
  receivedAt: number;
}

export type KindFilter =
  | "all"
  | "notes"
  | "articles"
  | "zaps"
  | "reactions"
  | "profiles";

export const KIND_LABELS: Record<number, string> = {
  0: "Profile",
  1: "Note",
  3: "Contacts",
  7: "Reaction",
  9735: "Zap",
  30023: "Article",
};

export const KIND_FILTER_KINDS: Record<KindFilter, number[]> = {
  all: [],
  notes: [1],
  articles: [30023],
  zaps: [9735],
  reactions: [7],
  profiles: [0],
};

export async function fetchRelayInfo(wssUrl: string): Promise<RelayInfo> {
  const httpUrl = wssUrl
    .replace(/^wss:\/\//, "https://")
    .replace(/^ws:\/\//, "http://");
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(httpUrl, {
      headers: { Accept: "application/nostr+json" },
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return (await res.json()) as RelayInfo;
  } finally {
    clearTimeout(timeoutId);
  }
}

export function getContentPreview(event: ExplorerEvent): string {
  switch (event.kind) {
    case 0: {
      try {
        const p = JSON.parse(event.content) as Record<string, string>;
        return p.name || p.display_name || "Profile update";
      } catch {
        return "Profile update";
      }
    }
    case 1:
      return event.content.slice(0, 100) || "(empty note)";
    case 3: {
      const n = event.tags.filter((t) => t[0] === "p").length;
      return `${n} contact${n !== 1 ? "s" : ""}`;
    }
    case 7:
      return `"${event.content || "+"}" reaction`;
    case 9735:
      return "Zap receipt";
    case 30023: {
      const titleTag = event.tags.find((t) => t[0] === "title");
      return titleTag?.[1] || event.content.slice(0, 100) || "Article";
    }
    default:
      return event.content.slice(0, 100) || "(no content)";
  }
}

export function relativeTime(unixSecs: number): string {
  const diff = Math.floor(Date.now() / 1000 - unixSecs);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export function truncateNpub(hexPubkey: string): string {
  try {
    const npub = npubEncode(hexPubkey);
    return npub.slice(0, 8) + ":" + npub.slice(-4);
  } catch {
    return hexPubkey.slice(0, 8) + ":" + hexPubkey.slice(-4);
  }
}

export function getNjumpUrl(event: ExplorerEvent): string {
  try {
    if (event.kind === 1) {
      return `https://njump.me/${noteEncode(event.id)}`;
    }
    return `https://njump.me/${neventEncode({
      id: event.id,
      author: event.pubkey,
      kind: event.kind,
    })}`;
  } catch {
    return `https://njump.me/${event.id}`;
  }
}

export type WsStatus = "connecting" | "connected" | "closed" | "error";

export function connectRelayExplorer(
  wssUrl: string,
  onEvent: (event: ExplorerEvent) => void,
  onStatus: (status: WsStatus) => void
): () => void {
  const subId = Math.random().toString(36).slice(2, 10);
  let ws: WebSocket | null = null;
  let closed = false;

  onStatus("connecting");

  try {
    ws = new WebSocket(wssUrl);
  } catch {
    onStatus("error");
    return () => {};
  }

  ws.onopen = () => {
    if (closed) return;
    onStatus("connected");
    ws!.send(
      JSON.stringify([
        "REQ",
        subId,
        { limit: 50, kinds: [0, 1, 3, 7, 9735, 30023] },
      ])
    );
  };

  ws.onmessage = (e: MessageEvent) => {
    if (closed) return;
    try {
      const msg = JSON.parse(e.data as string) as unknown[];
      if (msg[0] === "EVENT" && msg[2]) {
        const ev = msg[2] as Omit<ExplorerEvent, "receivedAt">;
        onEvent({ ...ev, receivedAt: Date.now() });
      }
    } catch {
      // ignore parse errors
    }
  };

  ws.onclose = () => {
    if (!closed) onStatus("closed");
  };

  ws.onerror = () => {
    if (!closed) onStatus("error");
  };

  return () => {
    closed = true;
    try {
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(["CLOSE", subId]));
      }
      ws?.close();
    } catch {
      // ignore
    }
  };
}
