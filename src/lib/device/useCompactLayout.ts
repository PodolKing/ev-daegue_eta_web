"use client";

import { useEffect, useState } from "react";

/**
 * Icon-rail compact mode — **not** DevTools CSS width presets (344/412 등).
 *
 * 1. Touch-primary device: `(hover: none) and (pointer: coarse)` → always compact
 *    (Galaxy Ultra/Fold 실기기 세로·가로 공통)
 * 2. Else narrow window: `max-width: 767px` (Tailwind `md` 미만) — 데스크톱에서 창만 줄인 경우
 *
 * Station list stays open; this only controls the left IconRail.
 * `analyticsDeviceType` is analytics-only — do not use for this UI.
 */
export function isCompactLayoutNow(): boolean {
  if (typeof window === "undefined") return false;

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
    const touchMq = window.matchMedia("(hover: none) and (pointer: coarse)");
    const narrowMq = window.matchMedia("(max-width: 767px)");

    const update = () => setCompact(isCompactLayoutNow());
    update();

    touchMq.addEventListener("change", update);
    narrowMq.addEventListener("change", update);
    return () => {
      touchMq.removeEventListener("change", update);
      narrowMq.removeEventListener("change", update);
    };
  }, []);

  return compact;
}
