"use client";

import { useEffect } from "react";

function isInsideMap(target: EventTarget | null): boolean {
  if (!(target instanceof Node)) return false;
  const map = document.getElementById("ev-tmap-map");
  return Boolean(map && (target === map || map.contains(target)));
}

/**
 * Block browser page pinch-zoom outside the TMAP canvas.
 * Map keeps multi-touch for zoom; buttons/list/UI do not enlarge the page.
 */
export function DisableBrowserZoom() {
  useEffect(() => {
    const preventGesture = (e: Event) => {
      if (isInsideMap(e.target)) return;
      e.preventDefault();
    };

    const preventMultiTouchMove = (e: TouchEvent) => {
      if (e.touches.length < 2) return;
      if (isInsideMap(e.target)) return;
      e.preventDefault();
    };

    document.addEventListener("gesturestart", preventGesture, {
      passive: false,
    });
    document.addEventListener("gesturechange", preventGesture, {
      passive: false,
    });
    document.addEventListener("gestureend", preventGesture, {
      passive: false,
    });
    document.addEventListener("touchmove", preventMultiTouchMove, {
      passive: false,
    });

    return () => {
      document.removeEventListener("gesturestart", preventGesture);
      document.removeEventListener("gesturechange", preventGesture);
      document.removeEventListener("gestureend", preventGesture);
      document.removeEventListener("touchmove", preventMultiTouchMove);
    };
  }, []);

  return null;
}
