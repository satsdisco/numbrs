import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, ChevronRight, Server } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { fetchRelayInfo } from "@/lib/relay-explorer";
import { cn } from "@/lib/utils";
import { npubEncode } from "nostr-tools/nip19";

interface Nip11PanelProps {
  relayUrl: string;
}

function truncatePubkey(hex: string): string {
  try {
    const npub = npubEncode(hex);
    return npub.slice(0, 12) + "…" + npub.slice(-6);
  } catch {
    return hex.slice(0, 16) + "…";
  }
}

function LimitRow({ label, value }: { label: string; value: string | number | boolean | undefined }) {
  if (value === undefined || value === null) return null;
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-metric-sm text-muted-foreground">{label}</span>
      <span className="font-mono text-metric-sm text-foreground tabular-nums">
        {typeof value === "boolean" ? (value ? "yes" : "no") : String(value)}
      </span>
    </div>
  );
}

export default function Nip11Panel({ relayUrl }: Nip11PanelProps) {
  const [open, setOpen] = useState(true);

  const { data: info, isLoading, error } = useQuery({
    queryKey: ["relay-nip11", relayUrl],
    queryFn: () => fetchRelayInfo(relayUrl),
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  const hasLimitations =
    info?.limitation &&
    Object.values(info.limitation).some((v) => v !== undefined && v !== null);

  return (
    <div className="rounded-lg border border-border bg-card">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors rounded-lg"
      >
        <div className="flex items-center gap-2">
          <Server className="h-4 w-4 text-muted-foreground" />
          <span className="font-mono text-sm font-medium text-foreground">
            Relay Info
          </span>
          {info?.name && (
            <span className="text-metric-sm text-muted-foreground">
              — {info.name}
            </span>
          )}
        </div>
        {open ? (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        )}
      </button>

      {open && (
        <div className="border-t border-border px-4 pb-4 pt-3 space-y-4">
          {isLoading && (
            <div className="flex items-center gap-2 text-metric-sm text-muted-foreground">
              <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              Fetching relay info…
            </div>
          )}

          {error && (
            <p className="text-metric-sm text-destructive">
              Could not fetch relay info — relay may not support NIP-11.
            </p>
          )}

          {info && (
            <div className="space-y-4">
              {/* Name + Description */}
              {(info.name || info.description) && (
                <div className="space-y-1">
                  {info.name && (
                    <p className="font-mono text-sm font-semibold text-foreground">
                      {info.name}
                    </p>
                  )}
                  {info.description && (
                    <p className="text-metric-sm text-muted-foreground leading-relaxed">
                      {info.description}
                    </p>
                  )}
                </div>
              )}

              {/* Metadata grid */}
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {info.pubkey && (
                  <div className="rounded-md border border-border bg-muted/20 px-3 py-2">
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      Pubkey
                    </span>
                    <p className="font-mono text-metric-sm text-foreground mt-0.5 break-all">
                      {truncatePubkey(info.pubkey)}
                    </p>
                  </div>
                )}
                {info.contact && (
                  <div className="rounded-md border border-border bg-muted/20 px-3 py-2">
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      Contact
                    </span>
                    <p className="font-mono text-metric-sm text-foreground mt-0.5 truncate">
                      {info.contact}
                    </p>
                  </div>
                )}
                {info.software && (
                  <div className="rounded-md border border-border bg-muted/20 px-3 py-2">
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      Software
                    </span>
                    <p className="font-mono text-metric-sm text-foreground mt-0.5 truncate">
                      {info.software}
                      {info.version && (
                        <span className="ml-1 text-muted-foreground">
                          v{info.version}
                        </span>
                      )}
                    </p>
                  </div>
                )}
              </div>

              {/* Supported NIPs */}
              {info.supported_nips && info.supported_nips.length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    Supported NIPs
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {info.supported_nips.map((nip) => (
                      <Badge
                        key={nip}
                        variant="outline"
                        className={cn(
                          "font-mono text-xs px-2 py-0.5",
                          [1, 4, 9, 11, 17, 42, 45].includes(nip)
                            ? "border-primary/40 text-primary"
                            : "text-muted-foreground"
                        )}
                      >
                        NIP-{nip}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Limitations */}
              {hasLimitations && (
                <div className="space-y-0.5">
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    Limitations
                  </span>
                  <div className="rounded-md border border-border divide-y divide-border">
                    <div className="px-3 py-0.5">
                      <LimitRow label="Max message length" value={info.limitation?.max_message_length} />
                      <LimitRow label="Max subscriptions" value={info.limitation?.max_subscriptions} />
                      <LimitRow label="Max filters" value={info.limitation?.max_filters} />
                      <LimitRow label="Max limit" value={info.limitation?.max_limit} />
                      <LimitRow label="Max event tags" value={info.limitation?.max_event_tags} />
                      <LimitRow label="Max content length" value={info.limitation?.max_content_length} />
                      <LimitRow label="Min PoW difficulty" value={info.limitation?.min_pow_difficulty} />
                      <LimitRow label="Auth required" value={info.limitation?.auth_required} />
                      <LimitRow label="Payment required" value={info.limitation?.payment_required} />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
