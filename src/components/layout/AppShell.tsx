"use client";

import { useEffect, useRef, useState } from "react";
import { IconRail, type NavId } from "@/components/layout/IconRail";
import { TopBar } from "@/components/layout/TopBar";
import { MapView } from "@/components/map/MapView";
import { StationList } from "@/components/map/StationList";
import { MobileStationSheet } from "@/components/map/MobileStationSheet";
import { CarPanel } from "@/components/car/CarPanel";
import { UnimplementedHint } from "@/components/ui/Unimplemented";
import { fetchHealth, fetchStations } from "@/lib/api";
import { useCompactLayout } from "@/lib/device/useCompactLayout";
import { FEATURES } from "@/lib/features";
import { DAEGU_CENTER, useMapStore, MOBILE_SHEET_OFFSET } from "@/stores/mapStore";
import { useLocationStore } from "@/stores/locationStore";

/** Min move from last stations fetch origin before refetch (watch ticks). */
const STATIONS_REFETCH_MIN_M = 200;
/** If still under distance threshold, refetch at most this often on coords churn. */
const STATIONS_REFETCH_MIN_MS = 4000;

function haversineMeters(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function AppShell() {
  const [activeNav, setActiveNav] = useState<NavId>("map");
  const isCompact = useCompactLayout();
  const [apiOnline, setApiOnline] = useState<boolean | null>(null);
  /** Station list side panel (md+) — default open. */
  const [listPanelOpen, setListPanelOpen] = useState(true);
  /** Icon rail — default closed until layout known (touch phones stay closed). */
  const [railOpen, setRailOpen] = useState(false);
  const didBootstrapCenter = useRef(false);
  const prevCompact = useRef<boolean | null>(null);

  const radiusKm = useMapStore((s) => s.radiusKm);
  const setCenter = useMapStore((s) => s.setCenter);
  const setStations = useMapStore((s) => s.setStations);
  const setLoading = useMapStore((s) => s.setLoading);
  const setError = useMapStore((s) => s.setError);
  const mobileSheetSnap = useMapStore((s) => s.mobileSheetSnap);


  const coords = useLocationStore((s) => s.coords);
  const locateOnce = useLocationStore((s) => s.locateOnce);
  const startWatch = useLocationStore((s) => s.startWatch);
  const setFollow = useLocationStore((s) => s.setFollow);
  const stationsReqId = useRef(0);
  const lastStationsFetchRef = useRef<{
    lat: number;
    lng: number;
    radiusKm: number;
    at: number;
  } | null>(null);
  const stationsDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  useEffect(() => {
    fetchHealth()
      .then(() => setApiOnline(true))
      .catch(() => setApiOnline(false));
  }, []);

  useEffect(() => {
    // Default: GPS watch on (calc origin follows real GPS). 시험주행만 fake로 바꿈.
    void locateOnce()
      .catch(() => {
        /* stay on DAEGU_CENTER; error lives in locationStore */
      })
      .finally(() => {
        if (!FEATURES.locationWatch) return;
        if (useLocationStore.getState().testMode) return;
        startWatch();
        setFollow(true);
      });
  }, [locateOnce, startWatch, setFollow]);

  useEffect(() => {
    if (!coords || didBootstrapCenter.current) return;
    didBootstrapCenter.current = true;
    setCenter({ lat: coords.lat, lng: coords.lng });
  }, [coords, setCenter]);

  // radius: always refetch. coords: distance / time throttle (watch-friendly).
  useEffect(() => {
    const origin = coords ?? DAEGU_CENTER;

    const runFetch = () => {
      const reqId = ++stationsReqId.current;
      lastStationsFetchRef.current = {
        lat: origin.lat,
        lng: origin.lng,
        radiusKm,
        at: Date.now(),
      };
      setLoading(true);
      setError(null);

      void fetchStations({
        lat: origin.lat,
        lng: origin.lng,
        radiusKm,
      })
        .then((data) => {
          if (reqId !== stationsReqId.current) return;
          setStations(data.items ?? []);
        })
        .catch(() => {
          if (reqId !== stationsReqId.current) return;
          setStations([]);
          setError("충전소 목록을 불러오지 못했습니다. API 서버를 확인하세요.");
        })
        .finally(() => {
          if (reqId !== stationsReqId.current) return;
          setLoading(false);
        });
    };

    const prev = lastStationsFetchRef.current;
    const radiusChanged = !prev || prev.radiusKm !== radiusKm;

    if (radiusChanged) {
      if (stationsDebounceRef.current) {
        clearTimeout(stationsDebounceRef.current);
        stationsDebounceRef.current = null;
      }
      runFetch();
      return;
    }

    const movedM = haversineMeters(prev, origin);
    const elapsed = Date.now() - prev.at;

    if (movedM >= STATIONS_REFETCH_MIN_M || elapsed >= STATIONS_REFETCH_MIN_MS) {
      if (stationsDebounceRef.current) {
        clearTimeout(stationsDebounceRef.current);
        stationsDebounceRef.current = null;
      }
      runFetch();
      return;
    }

    // Small GPS jitter: one trailing refetch after quiet window
    if (stationsDebounceRef.current) {
      clearTimeout(stationsDebounceRef.current);
    }
    const wait = Math.max(0, STATIONS_REFETCH_MIN_MS - elapsed);
    stationsDebounceRef.current = setTimeout(() => {
      stationsDebounceRef.current = null;
      runFetch();
    }, wait);

    return () => {
      if (stationsDebounceRef.current) {
        clearTimeout(stationsDebounceRef.current);
        stationsDebounceRef.current = null;
      }
    };
  }, [
    radiusKm,
    coords?.lat,
    coords?.lng,
    setStations,
    setLoading,
    setError,
  ]);

  // Touch / <md → rail closed by default. Crossing into desktop → open rail.
  // User can still toggle; only auto-sync when compact *mode* changes.
  useEffect(() => {
    if (prevCompact.current === null) {
      prevCompact.current = isCompact;
      setRailOpen(!isCompact);
      return;
    }
    if (prevCompact.current === isCompact) return;
    prevCompact.current = isCompact;
    setRailOpen(!isCompact);
  }, [isCompact]);

  // Rail width change → TMAP canvas resize
  useEffect(() => {
    const map = useMapStore.getState().map;
    if (!map || typeof map.resize !== "function") return;
    const id = window.setTimeout(() => map.resize(), 220);
    return () => window.clearTimeout(id);
  }, [railOpen, listPanelOpen, mobileSheetSnap]);

  return (
    <div className="flex h-dvh w-full overflow-hidden bg-[var(--bg)]">
      <div
        className={[
          "relative z-20 h-full shrink-0 overflow-hidden border-[var(--border)] bg-[var(--surface)] transition-[width] duration-200",
          railOpen ? "w-[68px] border-r" : "w-0 border-r-0",
        ].join(" ")}
      >
        <div className="h-full w-[68px]">
          <IconRail
            active={activeNav}
            onSelect={(id) => {
              setActiveNav(id);
              setListPanelOpen(true);
            }}
          />
        </div>
      </div>

      {/* Discord-like channel panel — station list (md+), default open */}
      <div
        className={[
          "relative z-10 hidden h-full shrink-0 border-r border-[var(--border)] bg-[var(--surface)] transition-[width] duration-200 md:block",
          listPanelOpen ? "w-[300px]" : "w-0 overflow-hidden border-r-0",
        ].join(" ")}
      >
        {activeNav === "map" && <StationList />}
        {activeNav === "favorites" && (
          <UnimplementedHint>즐겨찾기</UnimplementedHint>
        )}
        {activeNav === "points" && (
          <UnimplementedHint>포인트</UnimplementedHint>
        )}
        {activeNav === "car" && <CarPanel />}
        {activeNav === "settings" && (
          <UnimplementedHint>설정</UnimplementedHint>
        )}
      </div>

      <main
        className="relative min-w-0 flex-1"
        style={
          {
            // MobileStationSheet updates this while dragging; fallback = snap height
            ["--map-sheet-offset" as string]:
              MOBILE_SHEET_OFFSET[mobileSheetSnap],
          }
        }
      >
        <TopBar apiOnline={apiOnline} />
        <MapView />

        {/* Compact: toggle icon rail — same FAB size as map controls */}
        {isCompact && (
          <button
            type="button"
            onClick={() => setRailOpen((v) => !v)}
            className={[
              "absolute bottom-[calc(var(--map-sheet-offset,42dvh)+0.75rem)] right-3 z-[45] flex h-10 w-10 items-center justify-center rounded-full border shadow touch-manipulation md:bottom-4",
              railOpen
                ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]"
                : "border-[var(--border)] bg-white text-[var(--text-secondary)]",
            ].join(" ")}
            aria-label={railOpen ? "메뉴 닫기" : "메뉴 열기"}
            aria-expanded={railOpen}
            title={railOpen ? "메뉴 닫기" : "메뉴"}
          >
            {railOpen ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path
                  d="M7 7l10 10M17 7 7 17"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="square"
                />
              </svg>
            ) : (
              /* Side-rail glyph — not equal hamburger bars */
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path
                  d="M5 5.5h3.5v13H5z"
                  fill="currentColor"
                />
                <path
                  d="M11 7h8M11 12h6.5M11 17h7"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="square"
                />
              </svg>
            )}
          </button>
        )}

        {/* md+: toggle station list side panel */}
        <button
          type="button"
          onClick={() => setListPanelOpen((v) => !v)}
          className="absolute left-3 top-1/2 z-[45] hidden -translate-y-1/2 rounded-[var(--radius-pill)] border border-[var(--border)] bg-white px-2.5 py-2 text-[12px] font-medium text-[var(--text-secondary)] shadow-[var(--shadow-sm)] touch-manipulation md:block"
          aria-label={listPanelOpen ? "목록 접기" : "목록 펼치기"}
          aria-expanded={listPanelOpen}
        >
          {listPanelOpen ? "‹" : "›"}
        </button>

        <MobileStationSheet />
      </main>
    </div>
  );
}
