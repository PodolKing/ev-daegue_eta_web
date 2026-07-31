"use client";

import { useEffect, useRef } from "react";
import { FEATURES } from "@/lib/features";
import {
  UnimplementedBadge,
  UnimplementedHint,
} from "@/components/ui/Unimplemented";
import { useMapStore } from "@/stores/mapStore";
import { useRouteStore } from "@/stores/routeStore";

declare global {
  interface Window {
    Tmapv2: any;
  }
}

/**
 * After place search select: compact summary + 길찾기 (origin = 현위치).
 * Shared startDirections also used by StationDetailCard.
 */
export function PlaceSummaryBar() {
  const destination = useRouteStore((s) => s.destination);
  const status = useRouteStore((s) => s.status);
  const error = useRouteStore((s) => s.error);
  const clearDestination = useRouteStore((s) => s.clearDestination);
  const startDirections = useRouteStore((s) => s.startDirections);
  const selectedId = useMapStore((s) => s.selectedId);
  const map = useMapStore((s) => s.map);
  const markerRef = useRef<any>(null);
  const distanceM = useRouteStore((s) => s.distanceM);
  const durationSec = useRouteStore((s) => s.durationSec);
  const etaLabel =
    distanceM !== null && durationSec !== null
      ? `${(distanceM / 1000).toFixed(1)} km · 약 ${Math.round(durationSec / 60)}분`
      : null;

  // Destination pin on TMAP (search pick). Cleared with destination.
  useEffect(() => {
    if (!map || !window.Tmapv2?.Marker || !window.Tmapv2?.LatLng) return;

    if (markerRef.current) {
      try {
        markerRef.current.setMap(null);
      } catch {
        /* ignore */
      }
      markerRef.current = null;
    }

    // Search-pick pin only (station already has its own marker).
    if (!destination || selectedId) return;

    markerRef.current = new window.Tmapv2.Marker({
      position: new window.Tmapv2.LatLng(destination.lat, destination.lng),
      map,
      title: destination.name,
    });

    return () => {
      if (markerRef.current) {
        try {
          markerRef.current.setMap(null);
        } catch {
          /* ignore */
        }
        markerRef.current = null;
      }
    };
  }, [map, destination, selectedId]);

  // Station detail owns 길찾기 while a station is selected.
  if (!destination || selectedId) return null;

  const showUnimplemented = error === "__UNIMPLEMENTED__";
  const routeActive = status === "loading" || status === "ready";

  return (
    <div className="pointer-events-auto w-full max-w-[min(100%,380px)] animate-fade-up">
      <div className="flex items-center gap-3 rounded-[var(--radius-lg)] border border-[var(--border)] bg-white/95 px-3 py-2.5 shadow-[var(--shadow-md)] backdrop-blur-md">
        <div className="min-w-0 flex-1">
          <p
            className="truncate text-[14px] font-semibold text-[var(--text)]"
            style={{ fontFamily: "var(--font-display), sans-serif" }}
          >
            {destination.name}
          </p>
          <p className="mt-0.5 truncate text-[11px] text-[var(--text-muted)]">
            {destination.address || "주소 정보 없음"}
          </p>
        </div>
        {routeActive ? (
          <button
            type="button"
            onClick={() => clearDestination()}
            className="shrink-0 rounded-[var(--radius-pill)] border border-[var(--border)] bg-white px-3 py-2 text-[12px] font-semibold text-[var(--text-secondary)] touch-manipulation hover:bg-[var(--surface-muted)]"
          >
            경로 취소
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => startDirections()}
          className="relative shrink-0 rounded-[var(--radius-pill)] bg-[var(--accent)] px-3.5 py-2 text-[12px] font-semibold text-white touch-manipulation hover:opacity-90"
        >
          {status === "ready" ? "다시" : "길찾기"}
          {!FEATURES.tmapRouteFind ? (
            <span className="absolute -right-1 -top-1">
              <UnimplementedBadge />
            </span>
          ) : null}
        </button>
        <button
          type="button"
          onClick={() => clearDestination()}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--surface-muted)] text-[var(--text-muted)] touch-manipulation hover:text-[var(--text)]"
          aria-label={routeActive ? "경로 취소" : "장소 요약 닫기"}
        >
          ×
        </button>
      </div>
      {status === "loading" ? (
        <p className="mt-2 text-[12px] text-[var(--text-muted)]">경로 찾는 중…</p>
      ) : null}
      {status === "ready" && etaLabel ? (
        <p className="mt-2 text-[12px] font-medium text-[var(--text)]">{etaLabel}</p>
      ) : null}
      {status === "error" && error && error !== "__UNIMPLEMENTED__" ? (
        <p className="mt-2 rounded-[var(--radius-md)] border border-[var(--border)] bg-white/95 px-3 py-2 text-[12px] text-[var(--danger)] shadow-[var(--shadow-sm)]">
          {error}
        </p>
      ) : null}
      {showUnimplemented ? (
        <div className="mt-2">
          <UnimplementedHint>
            TMAP 자동차 경로(길찾기) API가 아직 연결되지 않았습니다. 출발=현위치.
          </UnimplementedHint>
        </div>
      ) : null}
    </div>
  );
}
