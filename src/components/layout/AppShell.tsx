"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { IconRail } from "@/components/layout/IconRail";
import { TopBar } from "@/components/layout/TopBar";
import { MapView } from "@/components/map/MapView";
import { StationList } from "@/components/map/StationList";
import { fetchHealth, fetchStations } from "@/lib/api";
import { DAEGU_CENTER, useMapStore } from "@/stores/mapStore";
import { useLocationStore } from "@/stores/locationStore";

export function AppShell() {
  const [apiOnline, setApiOnline] = useState<boolean | null>(null);
  const [panelOpen, setPanelOpen] = useState(true);
  const didBootstrapCenter = useRef(false);

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

  // Bootstrap: soft-fail GPS (permission off must not throw / freeze UI)
  useEffect(() => {
    void locateOnce().catch(() => {
      /* stay on DAEGU_CENTER; error lives in locationStore */
    });
  }, [locateOnce]);

  // First successful fix only → map center (later pans: MapView 현위치 버튼)
  useEffect(() => {
    if (!coords || didBootstrapCenter.current) return;
    didBootstrapCenter.current = true;
    setCenter({ lat: coords.lat, lng: coords.lng });
  }, [coords, setCenter]);

  useEffect(() => {
    void loadStations();
  }, [loadStations]);

  return (
    <div className="flex h-dvh w-full overflow-hidden bg-[var(--bg)]">
      <IconRail />

      {/* Discord-like channel panel */}
      <div
        className={[
          "relative z-10 hidden h-full shrink-0 border-r border-[var(--border)] bg-[var(--surface)] transition-[width] duration-200 md:block",
          panelOpen ? "w-[300px]" : "w-0 overflow-hidden border-r-0",
        ].join(" ")}
      >
        <StationList />
      </div>

      <main className="relative min-w-0 flex-1">
        <TopBar apiOnline={apiOnline} />
        <MapView />

        <button
          type="button"
          onClick={() => setPanelOpen((v) => !v)}
          className="absolute left-3 top-1/2 z-30 hidden -translate-y-1/2 rounded-[var(--radius-pill)] border border-[var(--border)] bg-white px-2.5 py-2 text-[12px] font-medium text-[var(--text-secondary)] shadow-[var(--shadow-sm)] md:block"
          aria-label={panelOpen ? "목록 접기" : "목록 펼치기"}
        >
          {panelOpen ? "‹" : "›"}
        </button>

        {/* Mobile bottom sheet list */}
        <div className="absolute inset-x-0 bottom-0 z-30 max-h-[42%] overflow-hidden rounded-t-[20px] border border-[var(--border)] bg-white shadow-[var(--shadow-md)] md:hidden">
          <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-[var(--border-strong)]" />
          <div className="h-[calc(42dvh-12px)]">
            <StationList />
          </div>
        </div>
      </main>
    </div>
  );
}
