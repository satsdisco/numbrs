/**
 * NIP-07 browser extension interface (nos2x, Alby, etc.)
 */

export interface NostrEvent {
  id: string;
  pubkey: string;
  created_at: number;
  kind: number;
  tags: string[][];
  content: string;
  sig: string;
}

interface WindowNostr {
  getPublicKey(): Promise<string>;
  signEvent(event: Omit<NostrEvent, "id" | "pubkey" | "sig">): Promise<NostrEvent>;
}

declare global {
  interface Window {
    nostr?: WindowNostr;
  }
}

export function hasNostrExtension(): boolean {
  return typeof window !== "undefined" && !!window.nostr;
}

export async function getPublicKey(): Promise<string> {
  if (!window.nostr) throw new Error("No Nostr extension found");
  return window.nostr.getPublicKey();
}

export async function signAuthEvent(): Promise<NostrEvent> {
  if (!window.nostr) throw new Error("No Nostr extension found");

  const unsignedEvent = {
    kind: 22242,
    created_at: Math.floor(Date.now() / 1000),
    tags: [["relay", window.location.origin]],
    content: "Sign in to NUMBERS",
  };

  return window.nostr.signEvent(unsignedEvent);
}

export function truncatePubkey(pubkey: string): string {
  return pubkey.slice(0, 8) + ":" + pubkey.slice(-4);
}
