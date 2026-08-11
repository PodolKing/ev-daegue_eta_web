import { create } from "zustand";
import { stationMatchesSlowFilter } from "@/lib/chargerTypes";
import type { RadiusKm, Station } from "@/types/station";
import { useLocationStore } from "@/stores/locationStore";
import { useRouteStore } from "@/stores/routeStore";

export const DAEGU_CENTER = { lat: 35.8714, lng: 128.6014 };

/** Mobile bottom sheet snaps (md+ uses side panel). */
export type MobileSheetSnap = "peek" | "half" | "full";

/** FAB / detail offset + sheet height per snap. */
export const MOBILE_SHEET_OFFSET: Record<MobileSheetSnap, string> = {
  peek: "2.75rem",
  half: "42dvh",
  full: "90dvh",
};

const SNAP_UP: Record<MobileSheetSnap, MobileSheetSnap> = {
  peek: "half",
  half: "full",
  full: "full",
};

const SNAP_DOWN: Record<MobileSheetSnap, MobileSheetSnap> = {
  peek: "peek",
  half: "peek",
  full: "half",
};

export function bumpSheetSnap(
  snap: MobileSheetSnap,
  dir: "up" | "down",
): MobileSheetSnap {
  return dir === "up" ? SNAP_UP[snap] : SNAP_DOWN[snap];
}

/** Handle tap toggle: peek ↔ half (full은 스와이프 up). */
export function toggleSheetSnap(snap: MobileSheetSnap): MobileSheetSnap {
  return snap === "peek" ? "half" : "peek";
}

/**
 * Drag-end snap (병원 시트 참고: offset + velocity).
 * offsetY > 0 = 손가락 아래로, velocityY px/s.
 */
export function resolveSheetSnapAfterDrag(
  current: MobileSheetSnap,
  offsetY: number,
  velocityY: number,
): MobileSheetSnap {
  const threshold = 50;
  const vThreshold = 400;

  if (velocityY > vThreshold || offsetY > threshold) {
    return bumpSheetSnap(current, "down");
  }
  if (velocityY < -vThreshold || offsetY < -threshold) {
    return bumpSheetSnap(current, "up");
  }
  return current;
}

type MapState = {
  center: { lat: number; lng: number };
  zoom: number;
  radiusKm: RadiusKm;
  stations: Station[];
  selectedId: string | null;
  /** Mobile bottom station list sheet snap. */
  mobileSheetSnap: MobileSheetSnap;
  /**
   * Compact search bar open / typing — hide FABs that sit on `--map-sheet-offset`
   * so they do not cover the search field when the keyboard is up.
   */
  searchUiOpen: boolean;
  /**
   * 완속(02/08) 포함 여부. false(기본) = 그외 타입만 목록/마커에 표시.
   */
  includeSlow: boolean;
  /**
   * When set, station list/markers fetch around this point.
   * source: destination = 도착지 주변(원 표시) / map = 이 지역 검색(원 없음).
   * null = use 현위치 (GPS / test coords).
   */
  stationsAnchor: {
    lat: number;
    lng: number;
    source?: "destination" | "map";
  } | null;
  loading: boolean;
  error: string | null;
  map: any | null;

  setCenter: (c: { lat: number; lng: number }) => void;
  setZoom: (z: number) => void;
  setRadiusKm: (r: RadiusKm) => void;
  setStations: (items: Station[]) => void;
  upsertStations: (items: Station[]) => void;
  setSelectedId: (id: string | null) => void;
  setMobileSheetSnap: (snap: MobileSheetSnap) => void;
  setSearchUiOpen: (open: boolean) => void;
  /** Convenience: true → half, false → peek (detail card 등). */
  setMobileListOpen: (open: boolean) => void;
  setStationsAnchor: (
    a: { lat: number; lng: number; source?: "destination" | "map" } | null,
  ) => void;
  setIncludeSlow: (v: boolean) => void;
  /**
   * Select station: highlight, collapse sheet to peek, pan camera (zoom unchanged).
   * Stops GPS follow so the camera does not snap back.
   */
  selectStation: (id: string | null) => void;
  /**
   * AI 추천 미리보기용 — selectedId + pan만. destination은 건드리지 않음.
   * (selectStation은 clearDestination 하므로 AI 플로우에서 쓰지 말 것)
   */
  focusStationOnMap: (id: string, coords?: { lat: number; lng: number }) => void;
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
  mobileSheetSnap: "half",
  searchUiOpen: false,
  includeSlow: false,
  stationsAnchor: null,
  loading: false,
  error: null,
  map: null,

  setCenter: (center) => set({ center }),
  setZoom: (zoom) => set({ zoom }),
  setRadiusKm: (radiusKm) => set({ radiusKm }),
  setStations: (stations) =>
    set((s) => {
      const selected =
        s.selectedId != null
          ? s.stations.find((x) => x.stationId === s.selectedId)
          : null;
      let next = stations;
      if (
        selected &&
        !stations.some((x) => x.stationId === selected.stationId)
      ) {
        next = [...stations, selected];
      }
      return { stations: next };
    }),
  upsertStations: (items) =>
    set((s) => {
      const byId = new Map(s.stations.map((x) => [x.stationId, x]));
      for (const item of items) byId.set(item.stationId, item);
      return { stations: [...byId.values()] };
    }),
  setSelectedId: (selectedId) => set({ selectedId }),
  setMobileSheetSnap: (mobileSheetSnap) => set({ mobileSheetSnap }),
  setSearchUiOpen: (searchUiOpen) => set({ searchUiOpen }),
  setMobileListOpen: (open) =>
    set({ mobileSheetSnap: open ? "half" : "peek" }),
  setStationsAnchor: (stationsAnchor) => set({ stationsAnchor }),
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

    const { stations, map, mobileSheetSnap } = get();
    const station = stations.find((s) => s.stationId === id);
    const wasExpanded = mobileSheetSnap !== "peek";

    useLocationStore.getState().setFollow(false);
    // Place-search preview만 닫기. 길찾기 중(loading/ready)에는 경로·ETA·선 유지.
    const route = useRouteStore.getState();
    if (route.status !== "loading" && route.status !== "ready") {
      route.clearDestination({ keepStationsAnchor: true });
    }

    set({
      selectedId: id,
      mobileSheetSnap: "peek",
      ...(station ? { center: { lat: station.lat, lng: station.lng } } : {}),
    });

    if (station) {
      panMapTo(station.lat, station.lng, map);
      if (wasExpanded) {
        window.setTimeout(() => {
          const m = get().map;
          if (m && typeof m.resize === "function") m.resize();
        }, 220);
      }
    }
  },
  focusStationOnMap: (id, coords) => {
    const { stations, map, mobileSheetSnap } = get();
    const station = stations.find((s) => s.stationId === id);
    const lat = station?.lat ?? coords?.lat;
    const lng = station?.lng ?? coords?.lng;
    const wasExpanded = mobileSheetSnap !== "peek";

    useLocationStore.getState().setFollow(false);
    set({
      selectedId: id,
      mobileSheetSnap: "peek",
      ...(lat != null && lng != null ? { center: { lat, lng } } : {}),
    });

    if (lat != null && lng != null) {
      panMapTo(lat, lng, map);
      if (wasExpanded) {
        window.setTimeout(() => {
          const m = get().map;
          if (m && typeof m.resize === "function") m.resize();
        }, 220);
      }
    }
  },
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  setMap: (map) => set({ map }),
  
}));
