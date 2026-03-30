import { useState, useEffect, useRef, useCallback } from "react";
import {
  ExplorerEvent,
  WsStatus,
  connectRelayExplorer,
} from "@/lib/relay-explorer";

const MAX_EVENTS = 200;

export function useRelayExplorer(relayUrl: string) {
  const [events, setEvents] = useState<ExplorerEvent[]>([]);
  const [status, setStatus] = useState<WsStatus | "idle">("idle");
  const [isPaused, setIsPaused] = useState(false);
  const isPausedRef = useRef(false);

  isPausedRef.current = isPaused;

  const handleEvent = useCallback((event: ExplorerEvent) => {
    if (isPausedRef.current) return;
    setEvents((prev) => [event, ...prev].slice(0, MAX_EVENTS));
  }, []);

  useEffect(() => {
    setEvents([]);
    setStatus("idle");

    const cleanup = connectRelayExplorer(relayUrl, handleEvent, setStatus);
    return cleanup;
  }, [relayUrl, handleEvent]);

  const togglePause = useCallback(() => setIsPaused((p) => !p), []);

  return { events, status, isPaused, togglePause };
}
