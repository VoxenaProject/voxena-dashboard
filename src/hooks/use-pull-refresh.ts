"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";

/**
 * Hook pour pull-to-refresh sur mobile.
 * Retourne les handlers touch et l'état de refresh.
 * Usage : ajouter onTouchStart/onTouchMove/onTouchEnd sur le container scrollable.
 */
export function usePullRefresh() {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const startY = useRef(0);
  const pulling = useRef(false);

  const THRESHOLD = 80;

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    const el = e.currentTarget as HTMLElement;
    if (el.scrollTop <= 0) {
      startY.current = e.touches[0].clientY;
      pulling.current = true;
    }
  }, []);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (!pulling.current || refreshing) return;
    const diff = e.touches[0].clientY - startY.current;
    if (diff > 0) {
      // Resistance : distance = diff * 0.4
      setPullDistance(Math.min(diff * 0.4, 120));
    } else {
      pulling.current = false;
      setPullDistance(0);
    }
  }, [refreshing]);

  const onTouchEnd = useCallback(() => {
    if (!pulling.current) return;
    pulling.current = false;
    if (pullDistance >= THRESHOLD && !refreshing) {
      setRefreshing(true);
      setPullDistance(THRESHOLD);
      try { navigator?.vibrate?.(15); } catch {}
      router.refresh();
      // Reset après un délai
      setTimeout(() => {
        setRefreshing(false);
        setPullDistance(0);
      }, 1000);
    } else {
      setPullDistance(0);
    }
  }, [pullDistance, refreshing, router]);

  return { refreshing, pullDistance, onTouchStart, onTouchMove, onTouchEnd };
}
