import { useState, useEffect, useRef, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

const MAX_PULL = 110;
const DEFAULT_THRESHOLD = 70;

export function usePullToRefresh({
  queryKeys,
  threshold = DEFAULT_THRESHOLD,
}: {
  queryKeys: unknown[][];
  threshold?: number;
}) {
  const queryClient = useQueryClient();
  const [pullPx, setPullPx] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // Refs for stable access inside event handlers (avoid stale closures)
  const startYRef = useRef(0);
  const isPullingRef = useRef(false);
  const pullPxRef = useRef(0);
  const isRefreshingRef = useRef(false);
  const queryKeysRef = useRef(queryKeys);
  useEffect(() => {
    queryKeysRef.current = queryKeys;
  }, [queryKeys]);

  const refresh = useCallback(async () => {
    isRefreshingRef.current = true;
    setIsRefreshing(true);
    setPullPx(0);
    pullPxRef.current = 0;
    setIsDragging(false);
    await Promise.all(
      queryKeysRef.current.map((key) =>
        queryClient.invalidateQueries({ queryKey: key as string[] })
      )
    );
    await new Promise<void>((r) => setTimeout(r, 700));
    isRefreshingRef.current = false;
    setIsRefreshing(false);
  }, [queryClient]);

  useEffect(() => {
    const onTouchStart = (e: TouchEvent) => {
      if (isRefreshingRef.current) return;
      if (window.scrollY > 5) return;
      startYRef.current = e.touches[0].clientY;
      isPullingRef.current = true;
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!isPullingRef.current || isRefreshingRef.current) return;
      const delta = e.touches[0].clientY - startYRef.current;
      if (delta <= 0) {
        isPullingRef.current = false;
        pullPxRef.current = 0;
        setPullPx(0);
        setIsDragging(false);
        return;
      }
      const dampened = Math.min(delta * 0.45, MAX_PULL);
      pullPxRef.current = dampened;
      setPullPx(dampened);
      setIsDragging(true);
    };

    const onTouchEnd = () => {
      if (!isPullingRef.current) return;
      isPullingRef.current = false;
      setIsDragging(false);
      if (pullPxRef.current >= threshold) {
        void refresh();
      } else {
        pullPxRef.current = 0;
        setPullPx(0);
      }
    };

    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("touchend", onTouchEnd);
    return () => {
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, [threshold, refresh]);

  // Slide in from -40px above → 0px at threshold, then rest at 8px during refresh
  const progress = Math.min(pullPx / threshold, 1);
  const visible = pullPx > 0 || isRefreshing;
  const translateY = isRefreshing ? 8 : progress * 40 - 40;

  const pullIndicator = (
    <div
      aria-hidden="true"
      className="fixed left-0 right-0 top-14 z-50 flex justify-center pointer-events-none"
      style={{
        opacity: visible ? (isRefreshing ? 1 : progress) : 0,
        transform: `translateY(${translateY}px)`,
        transition: isDragging
          ? "none"
          : "opacity 0.2s ease, transform 0.25s ease",
      }}
    >
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-background border border-border shadow-sm">
        <div
          className={cn(
            "h-4 w-4 rounded-full border-2 border-primary border-t-transparent",
            isRefreshing && "animate-spin"
          )}
          style={
            !isRefreshing
              ? { transform: `rotate(${progress * 270}deg)` }
              : undefined
          }
        />
      </div>
    </div>
  );

  return { pullIndicator, isRefreshing };
}
