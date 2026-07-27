"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { IconRail } from "@/components/layout/IconRail";
import { TopBar } from "@/components/layout/TopBar";
import { MapView } from "@/components/map/MapView";
import { StationList } from "@/components/map/StationList";
import { fetchHealth, fetchStations } from "@/lib/api";
import { useCompactLayout } from "@/lib/device/useCompactLayout";
import { DAEGU_CENTER, useMapStore } from "@/stores/mapStore";
import { useLocationStore } from "@/stores/locationStore";

export function AppShell() {
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

  const coords = useLocationStore((s) => s.coords);
  const locateOnce = useLocationStore((s) => s.locateOnce);

  const loadStations = useCallback(async () => {
    const origin = coords ?? DAEGU_CENTER;
    setLoading(true);
    setError(null);
    try {
      const data = await fetchStations({
        lat: origin.lat,
        lng: origin.lng,
        radiusKm,
      });
      setStations(data.items ?? []);
    } catch {
      setStations([]);
      setError("충전소 목록을 불러오지 못했습니다. API 서버를 확인하세요.");
    } finally {
      setLoading(false);
    }
  }, [radiusKm, coords, setStations, setLoading, setError]);

  useEffect(() => {
    fetchHealth()
      .then(() => setApiOnline(true))
      .catch(() => setApiOnline(false));
  }, []);

  useEffect(() => {
    void locateOnce().catch(() => {
      /* stay on DAEGU_CENTER; error lives in locationStore */
    });
  }, [locateOnce]);

  useEffect(() => {
    if (!coords || didBootstrapCenter.current) return;
    didBootstrapCenter.current = true;
    setCenter({ lat: coords.lat, lng: coords.lng });
  }, [coords, setCenter]);

  useEffect(() => {
    void loadStations();
  }, [loadStations]);

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
  }, [railOpen, listPanelOpen]);

  return (
    <div className="flex h-dvh w-full overflow-hidden bg-[var(--bg)]">
      <div
        className={[
          "relative z-20 h-full shrink-0 overflow-hidden border-[var(--border)] bg-[var(--surface)] transition-[width] duration-200",
          railOpen ? "w-[68px] border-r" : "w-0 border-r-0",
        ].join(" ")}
      >
        <div className="h-full w-[68px]">
          <IconRail />
        </div>
      </div>

      {/* Discord-like channel panel — station list (md+), default open */}
      <div
        className={[
          "relative z-10 hidden h-full shrink-0 border-r border-[var(--border)] bg-[var(--surface)] transition-[width] duration-200 md:block",
          listPanelOpen ? "w-[300px]" : "w-0 overflow-hidden border-r-0",
        ].join(" ")}
      >
        <StationList />
      </div>

      <main className="relative min-w-0 flex-1">
        <TopBar apiOnline={apiOnline} />
        <MapView />

        {/* Compact: toggle icon rail — same band as 반경/현위치 FAB (sheet 바로 위·우측) */}
        {isCompact && (
          <button
            type="button"
            onClick={() => setRailOpen((v) => !v)}
            className="absolute bottom-[calc(42dvh+0.75rem)] right-3 z-[45] rounded-[var(--radius-pill)] border border-[var(--border)] bg-white px-2.5 py-2 text-[12px] font-medium text-[var(--text-secondary)] shadow-[var(--shadow-sm)] touch-manipulation"
            aria-label={railOpen ? "메뉴 닫기" : "메뉴 열기"}
            aria-expanded={railOpen}
          >
            {railOpen ? "닫기" : "메뉴"}
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

        {/* Mobile bottom sheet — station list (fixed 42dvh; FABs sit just above) */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-30 md:hidden">
          <div className="pointer-events-auto max-h-[42dvh] overflow-hidden rounded-t-[20px] border border-[var(--border)] bg-white shadow-[var(--shadow-md)]">
            <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-[var(--border-strong)]" />
            <div className="h-[calc(42dvh-12px)]">
              <StationList />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
