"use client";

import { useEffect, useRef, useState } from "react";
import { FEATURES } from "@/lib/features";
import { destinationMarkerIcon } from "@/lib/tmap/roleMarkers";
import {
  UnimplementedBadge,
  UnimplementedHint,
} from "@/components/ui/Unimplemented";
import { queryNearbyStationsAt } from "@/lib/map/queryNearbyStations";
import { useLocationStore } from "@/stores/locationStore";
import { useMapStore } from "@/stores/mapStore";
import { usePlaceCategoryStore } from "@/stores/placeCategoryStore";
import { useRecommendStore } from "@/stores/recommendStore";
import { useRouteStore } from "@/stores/routeStore";

declare global {
  interface Window {
    Tmapv2: any;
  }
}

/**
 * After place search select: compact summary + 길찾기 (origin = 현위치).
 * Shared startDirections also used by StationDetailCard.
 * Minimize collapses UI only — does NOT clearDestination (안내종료만 종료).
 * AI 추천: 카테고리 칩 활성 중에는 숨김(길찾기와 혼동 방지). 일반 장소·충전소 도착지는 노출.
 */
export function PlaceSummaryBar() {
  const destination = useRouteStore((s) => s.destination);
  const status = useRouteStore((s) => s.status);
  const error = useRouteStore((s) => s.error);
  const clearDestination = useRouteStore((s) => s.clearDestination);
  const startDirections = useRouteStore((s) => s.startDirections);
  const loadRecommendations = useRecommendStore((s) => s.loadForDestination);
  const recommendActive = useRecommendStore((s) => s.active);
  const recommendLoading = useRecommendStore((s) => s.loading);
  const categoryActive = usePlaceCategoryStore((s) => s.active);
  const selectedId = useMapStore((s) => s.selectedId);
  const setSelectedId = useMapStore((s) => s.setSelectedId);
  const setCenter = useMapStore((s) => s.setCenter);
  const map = useMapStore((s) => s.map);
  const markerRef = useRef<any>(null);
  const [minimized, setMinimized] = useState(false);
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

  // New place → show full card again.
  useEffect(() => {
    setMinimized(false);
  }, [destination?.lat, destination?.lng, destination?.name]);

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
  if (recommendActive) return null;

  const showUnimplemented = error === "__UNIMPLEMENTED__";
  const routeActive = status === "loading" || status === "ready";
  const routeExpanded = status === "loading" || status === "ready";
  /** 검색 직후 preview만 — 길찾기 시작 후에는 숨김. */
  const showNearbyStations = status === "preview";
  const bizLabel =
    destination.lowerBizName?.trim() ||
    destination.middleBizName?.trim() ||
    null;
  const showParking = destination.parkFlag === true;

  const queryNearbyStations = () => {
    queryNearbyStationsAt(destination.lat, destination.lng);
  };

  /** AI 점수 목록·추천 마커만 — 주변 stations 조회 없음. 길찾기 전 선택용. */
  const runAiRecommend = () => {
    useLocationStore.getState().setFollow(false);
    setCenter({ lat: destination.lat, lng: destination.lng });
    if (map && window.Tmapv2?.LatLng && typeof map.setCenter === "function") {
      map.setCenter(new window.Tmapv2.LatLng(destination.lat, destination.lng));
    }
    void loadRecommendations({
      lat: destination.lat,
      lng: destination.lng,
      etaMinutes: 15,
    });
  };

  // Thin strip — map stays usable; route/destination kept.
  if (minimized) {
    return (
      <div className="pointer-events-auto w-full max-w-[min(100%,320px)] animate-fade-up">
        <button
          type="button"
          onClick={() => setMinimized(false)}
          className="flex w-full items-center gap-2 rounded-[var(--radius-pill)] border border-[var(--border)] bg-white/95 px-3 py-2 shadow-[var(--shadow-md)] backdrop-blur-md touch-manipulation"
          aria-label="도착지 요약 펼치기"
        >
          <span
            className="min-w-0 flex-1 truncate text-left text-[13px] font-semibold text-[var(--text)]"
            style={{ fontFamily: "var(--font-display), sans-serif" }}
            title={destination.name}
          >
            {destination.name}
          </span>
          {routeActive && (etaMin || etaKm) ? (
            <span className="shrink-0 text-[12px] font-semibold text-[var(--accent)]">
              {[etaMin ? `${etaMin}분` : null, etaKm ? `${etaKm}km` : null]
                .filter(Boolean)
                .join(" · ")}
            </span>
          ) : null}
          <span className="shrink-0 text-[11px] font-semibold text-[var(--text-secondary)]">
            펼치기
          </span>
        </button>
      </div>
    );
  }

  return (
    <div className="pointer-events-auto w-full max-w-[min(100%,320px)] animate-fade-up">
      <div
        className={[
          "rounded-[var(--radius-lg)] border border-[var(--border)] bg-white/95 shadow-[var(--shadow-md)] backdrop-blur-md",
          routeExpanded ? "p-3.5" : "px-3 py-2.5",
        ].join(" ")}
      >
        <div>
          {routeExpanded ? (
            <p className="text-[11px] font-medium uppercase tracking-[0.06em] text-[var(--text-muted)]">
              Directions
            </p>
          ) : null}

          <div
            className={[
              "flex min-w-0 items-start gap-2",
              routeExpanded ? "mt-1" : "",
            ].join(" ")}
          >
            <p
              className={[
                "min-w-0 flex-1 line-clamp-2 break-keep font-semibold text-[var(--text)]",
                routeExpanded
                  ? "text-[16px] font-bold tracking-tight"
                  : "text-[14px]",
              ].join(" ")}
              style={{ fontFamily: "var(--font-display), sans-serif" }}
              title={destination.name}
            >
              {destination.name}
            </p>
            {showNearbyStations ? (
              <button
                type="button"
                onClick={queryNearbyStations}
                className="inline-flex h-7 shrink-0 items-center rounded-[var(--radius-pill)] border border-[var(--border)] bg-white px-2 text-[11px] font-semibold text-[var(--text-secondary)] touch-manipulation hover:bg-[var(--surface-muted)]"
                aria-label="도착지 주변 충전소 조회"
              >
                주변
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => setMinimized(true)}
              className="inline-flex h-7 shrink-0 items-center rounded-[var(--radius-pill)] border border-[var(--border)] bg-[var(--surface-muted)] px-2 text-[11px] font-semibold text-[var(--text-secondary)] touch-manipulation hover:bg-white hover:text-[var(--text)]"
              aria-label="지도 보기 — 요약 접기"
            >
              접기
            </button>
          </div>
          {bizLabel || showParking ? (
            <p className="mt-1 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-[var(--text-muted)]">
              {bizLabel ? <span className="truncate">{bizLabel}</span> : null}
              {showParking ? (
                <span className="shrink-0 font-medium text-[var(--text-secondary)]">
                  주차 가능
                </span>
              ) : null}
            </p>
          ) : null}
          <p className="mt-1 truncate text-[11px] text-[var(--text-muted)]">
            {destination.address || "주소 정보 없음"}
          </p>
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

        <div
          className={[
            "flex items-center gap-2",
            routeExpanded ? "mt-3" : "mt-2 justify-end",
          ].join(" ")}
        >
          {!routeActive || (destination.stationId && !routeExpanded) ? (
            <div className="mr-auto flex items-center gap-2">
              {destination.stationId && !routeExpanded ? (
                <button
                  type="button"
                  onClick={() => setSelectedId(destination.stationId!)}
                  className="shrink-0 rounded-[var(--radius-pill)] border border-[var(--border)] bg-white px-3 py-1.5 text-[12px] font-semibold text-[var(--text-secondary)] touch-manipulation hover:bg-[var(--surface-muted)]"
                >
                  펼치기
                </button>
              ) : null}
              {!routeActive ? (
                <button
                  type="button"
                  onClick={() => clearDestination()}
                  className="shrink-0 rounded-[var(--radius-pill)] border border-[var(--border)] bg-white px-3 py-1.5 text-[12px] font-semibold text-[var(--text-secondary)] touch-manipulation hover:bg-[var(--surface-muted)]"
                >
                  닫기
                </button>
              ) : null}
            </div>
          ) : null}
          {routeActive ? (
            <button
              type="button"
              onClick={() => clearDestination()}
              className={[
                "rounded-[var(--radius-pill)] border border-[var(--border)] bg-white text-[12px] font-semibold text-[var(--text-secondary)] touch-manipulation hover:bg-[var(--surface-muted)]",
                routeExpanded
                  ? "flex-1 px-3 py-2.5 text-[13px]"
                  : "shrink-0 px-3 py-1.5",
              ].join(" ")}
            >
              안내종료
            </button>
          ) : null}
          {!routeActive && !categoryActive ? (
            <button
              type="button"
              onClick={runAiRecommend}
              disabled={recommendLoading}
              className={[
                "relative shrink-0 rounded-[var(--radius-pill)] border border-[var(--accent)] bg-white font-semibold text-[var(--accent)] touch-manipulation hover:bg-[var(--accent-soft)] disabled:opacity-60",
                routeExpanded
                  ? "flex-1 px-4 py-2.5 text-[13px]"
                  : "px-3.5 py-2 text-[12px]",
              ].join(" ")}
            >
              {recommendLoading
                ? "AI…"
                : recommendActive
                  ? "AI 다시"
                  : "AI 추천"}
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => startDirections()}
            className={[
              "relative shrink-0 rounded-[var(--radius-pill)] bg-[var(--accent)] font-semibold text-white touch-manipulation hover:opacity-90",
              routeExpanded
                ? "flex-1 px-4 py-2.5 text-[13px]"
                : "px-3.5 py-2 text-[12px]",
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
