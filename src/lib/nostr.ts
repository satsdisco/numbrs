/**
 * NIP-07 browser extension interface (nos2x, Alby, etc.)
 * + nsec / private key signing (NIP-01 via nostr-tools)
 * + NIP-46 remote signer (Amber, nsecBunker, etc.)
 */

import { finalizeEvent, generateSecretKey } from "nostr-tools";
import { decode as nip19Decode } from "nostr-tools/nip19";
import { parseBunkerInput, BunkerSigner } from "nostr-tools/nip46";
import { SimplePool } from "nostr-tools/pool";

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

/** NIP-07: sign via browser extension */
export async function signAuthEvent(): Promise<NostrEvent> {
  if (!window.nostr) throw new Error("No Nostr extension found");

  const unsignedEvent = {
    kind: 22242,
    created_at: Math.floor(Date.now() / 1000),
    tags: [["relay", window.location.origin]],
    content: "Sign in to numbrs",
  };

  return window.nostr.signEvent(unsignedEvent);
}

/** nsec / hex private key: sign locally via nostr-tools */
export async function signAuthEventWithNsec(nsecOrHex: string): Promise<NostrEvent> {
  let secretKey: Uint8Array;

  const trimmed = nsecOrHex.trim();
  if (trimmed.startsWith("nsec")) {
    const decoded = nip19Decode(trimmed);
    if (decoded.type !== "nsec") throw new Error("Invalid nsec key");
    secretKey = decoded.data as Uint8Array;
  } else {
    const hex = trimmed.toLowerCase();
    if (!/^[0-9a-f]{64}$/.test(hex)) {
      throw new Error("Invalid private key — must be nsec or 64-char hex");
    }
    secretKey = new Uint8Array(hex.match(/.{2}/g)!.map((b) => parseInt(b, 16)));
  }

  const template = {
    kind: 22242,
    created_at: Math.floor(Date.now() / 1000),
    tags: [["relay", window.location.origin]],
    content: "Sign in to numbrs",
  };

  const event = finalizeEvent(template, secretKey);
  return event as unknown as NostrEvent;
}

/** NIP-46: sign via remote bunker (Amber, nsecBunker, etc.) */
export async function signAuthEventWithBunker(bunkerUri: string): Promise<NostrEvent> {
  const bp = await parseBunkerInput(bunkerUri.trim());
  if (!bp) throw new Error("Invalid bunker URI — check the connection string");

  const clientKey = generateSecretKey();
  const pool = new SimplePool();
  const signer = BunkerSigner.fromBunker(clientKey, bp, { pool });

  try {
    await signer.connect();

    const template = {
      kind: 22242,
      created_at: Math.floor(Date.now() / 1000),
      tags: [["relay", window.location.origin]],
      content: "Sign in to numbrs",
    };

    const event = await signer.signEvent(template);
    return event as unknown as NostrEvent;
  } finally {
    await signer.close();
  }
}

export function truncatePubkey(pubkey: string): string {
  return pubkey.slice(0, 8) + ":" + pubkey.slice(-4);
}
