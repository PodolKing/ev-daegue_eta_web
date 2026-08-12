export type DeviceType = "mobile" | "tablet" | "desktop";

/**
 * Service / analytics device label — **not** for map chrome / IconRail.
 * Layout compact mode: {@link useCompactLayout}
 * (min-width 900 → desktop; else touch-primary or max-width 767 → compact).
 *
 * Client-only meaningful; SSR returns `"desktop"`.
 */
export function analyticsDeviceType(): DeviceType {
  if (typeof window === "undefined") {
    return "desktop";
  }

  const width = window.innerWidth || 0;
  const coarse =
    window.matchMedia?.("(pointer: coarse)")?.matches ?? false;

  const ua = (navigator.userAgent || "").toLowerCase();

  const isTabletUA = /ipad|tablet/.test(ua);
  const isMobileUA = /android|iphone|ipod|mobile/.test(ua);

  if (isTabletUA) {
    return "tablet";
  }

  if (isMobileUA) {
    return width >= 768 ? "tablet" : "mobile";
  }

  // Touch laptop / UA-as-desktop tablets
  if (coarse && width < 900) {
    return "mobile";
  }

  return "desktop";
}
