"use client";

import { useEffect, useRef } from "react";
import { FEATURES } from "@/lib/features";
import { destinationMarkerIcon } from "@/lib/tmap/roleMarkers";
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
  const setSelectedId = useMapStore((s) => s.setSelectedId);
  const map = useMapStore((s) => s.map);
  const markerRef = useRef<any>(null);
  const distanceM = useRouteStore((s) => s.distanceM);
  const durationSec = useRouteStore((s) => s.durationSec);
  const etaKm =
    distanceM !== null ? (distanceM / 1000).toFixed(1) : null;
  const etaMin =
    durationSec !== null ? String(Math.round(durationSec / 60)) : null;
  const etaLabel =
    distanceM !== null && durationSec !== null
      ? `${etaKm} km · 약 ${etaMin}분`
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
      icon: destinationMarkerIcon(),
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
  const routeExpanded = status === "loading" || status === "ready";

  return (
    <div className="pointer-events-auto w-full max-w-[min(100%,380px)] animate-fade-up">
      <div
        className={[
          "rounded-[var(--radius-lg)] border border-[var(--border)] bg-white/95 shadow-[var(--shadow-md)] backdrop-blur-md",
          routeExpanded ? "p-4" : "px-3 py-2.5",
        ].join(" ")}
      >
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            {routeExpanded ? (
              <p className="text-[11px] font-medium uppercase tracking-[0.06em] text-[var(--text-muted)]">
                Directions
              </p>
            ) : null}
            <p
              className={[
                "truncate font-semibold text-[var(--text)]",
                routeExpanded ? "mt-1 text-[17px] font-bold tracking-tight" : "text-[14px]",
              ].join(" ")}
              style={{ fontFamily: "var(--font-display), sans-serif" }}
            >
              {destination.name}
            </p>
            <p className="mt-0.5 truncate text-[11px] text-[var(--text-muted)]">
              {destination.address || "주소 정보 없음"}
            </p>
          </div>
          <button
            type="button"
            onClick={() => clearDestination()}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--surface-muted)] text-[var(--text-muted)] touch-manipulation hover:text-[var(--text)]"
            aria-label={routeActive ? "안내종료" : "장소 요약 닫기"}
          >
            ×
          </button>
        </div>

        {routeExpanded ? (
          <div className="mt-3 grid grid-cols-2 gap-2">
            <div className="flex aspect-square flex-col items-center justify-center rounded-[var(--radius-md)] bg-[var(--accent-soft)] px-2 py-3">
              {status === "loading" ? (
                <p className="text-center text-[12px] text-[var(--text-muted)]">
                  경로 찾는 중…
                </p>
              ) : (
                <>
                  <p
                    className="text-[32px] font-extrabold leading-none tracking-tight text-[var(--accent)]"
                    style={{ fontFamily: "var(--font-display), sans-serif" }}
                  >
                    {etaMin ?? "—"}
                  </p>
                  <p className="mt-1.5 text-[11px] font-medium text-[var(--text-muted)]">
                    약 분
                  </p>
                </>
              )}
            </div>
            <div className="flex aspect-square flex-col items-center justify-center rounded-[var(--radius-md)] bg-[var(--surface-muted)] px-2 py-3">
              {status === "loading" ? (
                <p className="text-center text-[12px] text-[var(--text-muted)]">…</p>
              ) : (
                <>
                  <p
                    className="text-[32px] font-extrabold leading-none tracking-tight text-[var(--text)]"
                    style={{ fontFamily: "var(--font-display), sans-serif" }}
                  >
                    {etaKm ?? "—"}
                  </p>
                  <p className="mt-1.5 text-[11px] font-medium text-[var(--text-muted)]">
                    경로 km
                  </p>
                </>
              )}
            </div>
          </div>
        ) : null}

        {status === "ready" && etaLabel ? (
          <p className="mt-2 text-center text-[13px] font-medium text-[var(--text)]">
            {etaLabel}
          </p>
        ) : null}

        <div className={routeExpanded ? "mt-3 flex gap-2" : "mt-0 flex items-center gap-2"}>
          {destination.stationId && !routeExpanded ? (
            <button
              type="button"
              onClick={() => setSelectedId(destination.stationId!)}
              className="shrink-0 rounded-[var(--radius-pill)] border border-[var(--border)] bg-white px-3 py-2 text-[12px] font-semibold text-[var(--text-secondary)] touch-manipulation hover:bg-[var(--surface-muted)]"
            >
              펼치기
            </button>
          ) : null}
          {routeActive ? (
            <button
              type="button"
              onClick={() => clearDestination()}
              className={[
                "rounded-[var(--radius-pill)] border border-[var(--border)] bg-white text-[12px] font-semibold text-[var(--text-secondary)] touch-manipulation hover:bg-[var(--surface-muted)]",
                routeExpanded
                  ? "flex-1 px-3 py-2.5 text-[13px]"
                  : "shrink-0 px-3 py-2",
              ].join(" ")}
            >
              안내종료
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => startDirections()}
            className={[
              "relative rounded-[var(--radius-pill)] bg-[var(--accent)] font-semibold text-white touch-manipulation hover:opacity-90",
              routeExpanded
                ? "flex-[1.4] px-4 py-2.5 text-[13px]"
                : "shrink-0 px-3.5 py-2 text-[12px]",
            ].join(" ")}
          >
            {status === "ready" ? (routeExpanded ? "다시 길찾기" : "다시") : "길찾기"}
            {!FEATURES.tmapRouteFind ? (
              <span className="absolute -right-1 -top-1">
                <UnimplementedBadge />
              </span>
            ) : null}
          </button>
        </div>
      </div>
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
