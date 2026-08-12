"use client";

import { useEffect, useState } from "react";

/**
 * Compact (앱) vs desktop (웹) chrome — **not** DevTools CSS width presets.
 *
 * Priority:
 * 1. Wide viewport `min-width: 900px` → always desktop (태블릿 가로·넓은 폴드 등).
 *    Fold8 펼침 CSS ~816은 여기 미만 → 앱 UI 유지.
 * 2. Else touch-primary `(hover: none) and (pointer: coarse)` → compact
 *    (폰 세로·가로 — orientation 무시, 가로 금지 없음).
 * 3. Else narrow window `max-width: 767px` → compact (PC 창만 줄인 경우).
 *
 * Do **not** also gate the same chrome with Tailwind `md:` — conflicts with (2).
 *
 * Station list / IconRail vs MobileBottomNav+sheet follow this flag only.
 * `analyticsDeviceType` is analytics-only — do not use for this UI.
 */
export function isCompactLayoutNow(): boolean {
  if (typeof window === "undefined") return false;

  const wide = window.matchMedia("(min-width: 900px)").matches;
  if (wide) return false;

  const touchPrimary = window.matchMedia(
    "(hover: none) and (pointer: coarse)",
  ).matches;
  if (touchPrimary) return true;

  return window.matchMedia("(max-width: 767px)").matches;
}

export function useCompactLayout(): boolean {
  /** Mobile-first: assume compact until measured (avoids rail flash on phones). */
  const [compact, setCompact] = useState(true);

  useEffect(() => {
    const wideMq = window.matchMedia("(min-width: 900px)");
    const touchMq = window.matchMedia("(hover: none) and (pointer: coarse)");
    const narrowMq = window.matchMedia("(max-width: 767px)");

    const update = () => setCompact(isCompactLayoutNow());
    update();

    wideMq.addEventListener("change", update);
    touchMq.addEventListener("change", update);
    narrowMq.addEventListener("change", update);
    return () => {
      wideMq.removeEventListener("change", update);
      touchMq.removeEventListener("change", update);
      narrowMq.removeEventListener("change", update);
    };
  }, []);

  return compact;
}
