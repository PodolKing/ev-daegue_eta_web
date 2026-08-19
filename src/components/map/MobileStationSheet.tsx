"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { CarPanel } from "@/components/car/CarPanel";
import { FavoritesPanel } from "@/components/favorites/FavoritesPanel";
import type { NavId } from "@/components/layout/IconRail";
import { MyPagePanel } from "@/components/mypage/MyPagePanel";
import { PointsPanel } from "@/components/points/PointsPanel";
import { StationList } from "@/components/map/StationList";
import {
  MOBILE_SHEET_OFFSET,
  resolveSheetSnapAfterDrag,
  toggleSheetSnap,
  useMapStore,
} from "@/stores/mapStore";
import type { MobileSheetSnap } from "@/stores/mapStore";

const FULL_VH = 0.9;
const HALF_VH = 0.42;
const PEEK_PX = 44;

/** SSR·CSR 동일 문자열 — window 높이로 px 계산하면 hydration mismatch. */
function snapTransformCss(snap: MobileSheetSnap): string {
  if (snap === "full") return "translate3d(0, 0, 0)";
  if (snap === "half") return "translate3d(0, calc(90dvh - 42dvh), 0)";
  return "translate3d(0, calc(90dvh - 2.75rem), 0)";
}

function snapTranslateYPx(snap: MobileSheetSnap, vh: number): number {
  const full = vh * FULL_VH;
  const visible =
    snap === "full" ? full : snap === "half" ? vh * HALF_VH : PEEK_PX;
  return Math.max(0, Math.round(full - visible));
}

/** Visible body under the handle. Half/peek must not use 90dvh or inner scroll never starts. */
function snapBodyHeightCss(snap: MobileSheetSnap): string {
  if (snap === "full") return "calc(90dvh - 2.75rem)";
  if (snap === "half") return "calc(42dvh - 2.75rem)";
  return "0px";
}

/**
 * Transform-based bottom sheet: finger follows while dragging,
 * ease on release. Resting snap uses dvh (no window on first paint).
 * Compact layout only (AppShell mounts when useCompactLayout). Not gated by md:.
 * Desktop uses the side panel instead.
 */
export function MobileStationSheet({
  activeNav = "map",
  onSelectNav,
}: {
  activeNav?: NavId;
  onSelectNav?: (id: NavId) => void;
}) {
  const mobileSheetSnap = useMapStore((s) => s.mobileSheetSnap);
  const setMobileSheetSnap = useMapStore((s) => s.setMobileSheetSnap);
  const rootRef = useRef<HTMLDivElement>(null);

  const [dragY, setDragY] = useState<number | null>(null);
  const [animating, setAnimating] = useState(false);
  const [ready, setReady] = useState(false);

  const dragRef = useRef<{
    pointerId: number;
    startY: number;
    baseTranslate: number;
    lastY: number;
    lastT: number;
    velocityY: number;
    didDrag: boolean;
  } | null>(null);
  const didDragClickGuardRef = useRef(false);

  const applyFabOffset = useCallback(
    (snap: MobileSheetSnap, y: number | null) => {
      const main = rootRef.current?.closest("main");
      if (!main) return;
      if (y == null) {
        main.style.setProperty("--map-sheet-offset", MOBILE_SHEET_OFFSET[snap]);
        return;
      }
      const full = window.innerHeight * FULL_VH;
      const visiblePx = Math.max(PEEK_PX, Math.round(full - y));
      main.style.setProperty("--map-sheet-offset", `${visiblePx}px`);
    },
    [],
  );

  useEffect(() => {
    setReady(true);
    const id = window.requestAnimationFrame(() => setAnimating(true));
    return () => window.cancelAnimationFrame(id);
  }, []);

  // deps 길이 고정 2 — HMR로 []↔[a,b] 바뀌면 React가 화냄. 저장 후 강력 새로고침.
  useLayoutEffect(() => {
    applyFabOffset(mobileSheetSnap, dragY);
  }, [dragY, mobileSheetSnap, applyFabOffset]);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    const now = performance.now();
    const h = window.innerHeight;
    setAnimating(false);
    const base = snapTranslateYPx(
      useMapStore.getState().mobileSheetSnap,
      h,
    );
    dragRef.current = {
      pointerId: e.pointerId,
      startY: e.clientY,
      baseTranslate: base,
      lastY: e.clientY,
      lastT: now,
      velocityY: 0,
      didDrag: false,
    };
    setDragY(base);
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    const d = dragRef.current;
    if (!d || d.pointerId !== e.pointerId) return;
    const now = performance.now();
    const dt = now - d.lastT;
    if (dt > 0) {
      d.velocityY = ((e.clientY - d.lastY) / dt) * 1000;
    }
    d.lastY = e.clientY;
    d.lastT = now;

    const offset = e.clientY - d.startY;
    if (Math.abs(offset) > 8) d.didDrag = true;

    const full = window.innerHeight * FULL_VH;
    const maxT = full - PEEK_PX;
    const next = Math.round(
      Math.min(maxT, Math.max(0, d.baseTranslate + offset)),
    );
    setDragY(next);
  }, []);

  const finishPointer = useCallback(
    (e: React.PointerEvent) => {
      const d = dragRef.current;
      if (!d || d.pointerId !== e.pointerId) return;
      try {
        (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }

      const offsetY = e.clientY - d.startY;
      const cur = useMapStore.getState().mobileSheetSnap;
      if (d.didDrag) {
        const next = resolveSheetSnapAfterDrag(cur, offsetY, d.velocityY);
        if (next !== cur) setMobileSheetSnap(next);
      }

      setAnimating(true);
      setDragY(null);
      dragRef.current = null;
    },
    [setMobileSheetSnap],
  );

  const onPointerUp = useCallback(
    (e: React.PointerEvent) => {
      didDragClickGuardRef.current = Boolean(dragRef.current?.didDrag);
      finishPointer(e);
    },
    [finishPointer],
  );

  const onPointerCancel = useCallback(
    (e: React.PointerEvent) => {
      didDragClickGuardRef.current = false;
      finishPointer(e);
    },
    [finishPointer],
  );

  const onToggleClick = useCallback(() => {
    if (didDragClickGuardRef.current) {
      didDragClickGuardRef.current = false;
      return;
    }
    setAnimating(true);
    setMobileSheetSnap(toggleSheetSnap(useMapStore.getState().mobileSheetSnap));
  }, [setMobileSheetSnap]);

  const panelTitle =
    activeNav === "car"
      ? "내 차량"
      : activeNav === "favorites"
        ? "즐겨찾기"
        : activeNav === "points"
          ? "포인트"
          : activeNav === "settings"
            ? "마이페이지"
            : "목록";
  const sheetLabel =
    mobileSheetSnap === "peek" ? panelTitle : "접기";
  const sheetAria =
    mobileSheetSnap === "peek"
      ? `${panelTitle} 펼치기`
      : "접기";

  const transform =
    dragY != null
      ? `translate3d(0, ${dragY}px, 0)`
      : snapTransformCss(mobileSheetSnap);

  return (
    <div
      ref={rootRef}
      className="pointer-events-none absolute inset-x-0 bottom-0 z-30 overflow-hidden"
      style={{ height: "90dvh" }}
      data-sheet-snap={mobileSheetSnap}
      data-sheet-fallback={MOBILE_SHEET_OFFSET[mobileSheetSnap]}
    >
      <div
        className="pointer-events-auto flex h-full flex-col overflow-hidden rounded-t-[20px] border border-[var(--border)] bg-white shadow-[var(--shadow-md)] will-change-transform"
        style={{
          transform,
          ...(ready && animating
            ? {
                transition: "transform 340ms cubic-bezier(0.32, 0.72, 0, 1)",
              }
            : { transition: "none" }),
        }}
      >
        <button
          type="button"
          onClick={onToggleClick}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerCancel}
          className="flex w-full shrink-0 select-none touch-none flex-col items-center pt-2 pb-1"
          aria-label={sheetAria}
          aria-expanded={mobileSheetSnap !== "peek"}
        >
          <span className="h-1 w-10 rounded-full bg-[var(--border-strong)]" />
          <span className="mt-1 text-[11px] font-medium text-[var(--text-muted)]">
            {sheetLabel}
          </span>
        </button>
        <div
          className="ev-scroll-panel min-h-0 overflow-y-auto overscroll-contain"
          style={{
            height:
              dragY != null
                ? `${Math.max(0, Math.round(window.innerHeight * FULL_VH - dragY - PEEK_PX))}px`
                : snapBodyHeightCss(mobileSheetSnap),
          }}
        >
          {activeNav === "map" && <StationList compactHeader />}
          {activeNav === "car" && <CarPanel />}
          {activeNav === "favorites" && <FavoritesPanel />}
          {activeNav === "points" && <PointsPanel />}
          {activeNav === "settings" && (
            <MyPagePanel onSelectNav={onSelectNav} />
          )}
        </div>
      </div>
    </div>
  );
}
