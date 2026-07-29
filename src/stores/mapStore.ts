import { create } from "zustand";
import { stationMatchesSlowFilter } from "@/lib/chargerTypes";
import type { RadiusKm, Station } from "@/types/station";
import { useLocationStore } from "@/stores/locationStore";

export const DAEGU_CENTER = { lat: 35.8714, lng: 128.6014 };

type MapState = {
  center: { lat: number; lng: number };
  zoom: number;
  radiusKm: RadiusKm;
  stations: Station[];
  selectedId: string | null;
  /** Mobile bottom station list sheet (md+ uses side panel instead). */
  mobileListOpen: boolean;
  /**
   * 완속(02/08) 포함 여부. false(기본) = 그외 타입만 목록/마커에 표시.
   */
  includeSlow: boolean;
  loading: boolean;
  error: string | null;
  map: any | null;

  setCenter: (c: { lat: number; lng: number }) => void;
  setZoom: (z: number) => void;
  setRadiusKm: (r: RadiusKm) => void;
  setStations: (items: Station[]) => void;
  setSelectedId: (id: string | null) => void;
  setMobileListOpen: (open: boolean) => void;
  setIncludeSlow: (v: boolean) => void;
  /**
   * Select station: highlight, close mobile list, pan camera (zoom unchanged).
   * Stops GPS follow so the camera does not snap back.
   */
  selectStation: (id: string | null) => void;
  setLoading: (v: boolean) => void;
  setError: (e: string | null) => void;
  setMap: (map: any) => void;
};

function panMapTo(lat: number, lng: number, map: any | null) {
  if (!map || !window.Tmapv2?.LatLng) return;
  if (typeof map.setCenter !== "function") return;
  map.setCenter(new window.Tmapv2.LatLng(lat, lng));
}

export const useMapStore = create<MapState>((set, get) => ({
  center: DAEGU_CENTER,
  zoom: 14,
  radiusKm: 1,
  stations: [],
  selectedId: null,
  mobileListOpen: true,
  includeSlow: false,
  loading: false,
  error: null,
  map: null,

  setCenter: (center) => set({ center }),
  setZoom: (zoom) => set({ zoom }),
  setRadiusKm: (radiusKm) => set({ radiusKm }),
  setStations: (stations) => set({ stations }),
  setSelectedId: (selectedId) => set({ selectedId }),
  setMobileListOpen: (mobileListOpen) => set({ mobileListOpen }),
  setIncludeSlow: (includeSlow) => {
    const { stations, selectedId } = get();
    let nextSelected = selectedId;
    if (!includeSlow && selectedId) {
      const sel = stations.find((s) => s.stationId === selectedId);
      if (sel && !stationMatchesSlowFilter(sel.chargerTypes, false)) {
        nextSelected = null;
      }
    }
    set({ includeSlow, selectedId: nextSelected });
  },
  selectStation: (id) => {
    if (id == null) {
      set({ selectedId: null });
      return;
    }

    const { stations, map } = get();
    const station = stations.find((s) => s.stationId === id);

    useLocationStore.getState().setFollow(false);

    set({
      selectedId: id,
      mobileListOpen: false,
      ...(station
        ? { center: { lat: station.lat, lng: station.lng } }
        : {}),
    });

    if (station) {
      panMapTo(station.lat, station.lng, map);
      window.setTimeout(() => {
        const m = get().map;
        if (m && typeof m.resize === "function") m.resize();
      }, 220);
    }
  },
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  setMap: (map) => set({ map }),
}));
