import { create } from "zustand";
import type {
  LatLng,
  LocationSource,
  LocationStatus,
} from "@/types/location";

/**
 * Shared user position for MapView, radius search origin, distance, future nav.
 * Camera center stays in mapStore — this store is “where the user is”, not “where the map looks”.
 */
type LocationState = {
  coords: LatLng | null;
  accuracyM: number | null;
  headingDeg: number | null;
  source: LocationSource | null;
  status: LocationStatus;
  error: string | null;
  /** When true, MapView may keep camera on coords (현위치 / future watch). */
  follow: boolean;
  testMode: boolean;

  setCoords: (c: LatLng | null) => void;
  setAccuracyM: (m: number | null) => void;
  setHeadingDeg: (d: number | null) => void;
  setSource: (s: LocationSource | null) => void;
  setStatus: (s: LocationStatus) => void;
  setError: (e: string | null) => void;
  setFollow: (v: boolean) => void;
  setTestMode: (v: boolean) => void;

  /**
   * One-shot geolocation → coords.
   * Always returns a Promise (reject on deny / timeout / unsupported).
   * Safe to call when permission is off — fails soft, does not hang the UI store.
   */
  locateOnce: () => Promise<LatLng>;
  startWatch: () => void;
  stopWatch: () => void;
  setTestCoords: (c: LatLng) => void;
  clear: () => void;
};

function geolocationErrorMessage(code?: number): string {
  switch (code) {
    case 1:
      return "위치 권한이 꺼져 있습니다. 브라우저·OS 설정에서 허용해 주세요.";
    case 2:
      return "위치를 확인할 수 없습니다.";
    case 3:
      return "위치 요청 시간이 초과되었습니다.";
    default:
      return "현재 위치를 가져오지 못했습니다.";
  }
}

export const useLocationStore = create<LocationState>((set, get) => ({
  coords: null,
  accuracyM: null,
  headingDeg: null,
  source: null,
  status: "idle",
  error: null,
  follow: false,
  testMode: false,

  setCoords: (coords) => set({ coords }),
  setAccuracyM: (accuracyM) => set({ accuracyM }),
  setHeadingDeg: (headingDeg) => set({ headingDeg }),
  setSource: (source) => set({ source }),
  setStatus: (status) => set({ status }),
  setError: (error) => set({ error }),
  setFollow: (follow) => set({ follow }),
  setTestMode: (testMode) => set({ testMode }),

  locateOnce: () => {
    if (get().testMode) {
      const existing = get().coords;
      if (!existing) {
        const error = "테스트 모드: 위치가 없습니다.";
        set({ status: "error", error, source: "test", follow: false });
        return Promise.reject(new Error(error));
      }
      set({ status: "ready", source: "test", error: null });
      return Promise.resolve(existing);
    }

    if (typeof navigator === "undefined" || !navigator.geolocation) {
      const error = "이 브라우저에서는 위치 정보를 지원하지 않습니다.";
      set({ status: "error", error, follow: false });
      return Promise.reject(new Error(error));
    }

    set({ status: "locating", error: null });

    return new Promise<LatLng>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const coords: LatLng = {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          };
          set({
            coords,
            accuracyM: pos.coords.accuracy ?? null,
            headingDeg: pos.coords.heading ?? null,
            source: "gps",
            status: "ready",
            error: null,
          });
          resolve(coords);
        },
        (err) => {
          const error = geolocationErrorMessage(err?.code);
          set({ status: "error", error, follow: false });
          reject(new Error(error));
        },
        {
          enableHighAccuracy: true,
          // Fail faster when OS/browser location is off (avoids long “hung” feel)
          timeout: 8000,
          maximumAge: 0,
        },
      );
    });
  },

  startWatch: () => {
    // TODO: navigator.geolocation.watchPosition → set coords; status "watching"
    set({ status: "watching", error: null });
  },

  stopWatch: () => {
    const next = get().coords ? "ready" : "idle";
    set({ status: next });
  },

  setTestCoords: (coords) => {
    if (!get().testMode) return;
    set({
      coords,
      source: "test",
      status: "ready",
      accuracyM: null,
      error: null,
    });
  },

  clear: () =>
    set({
      coords: null,
      accuracyM: null,
      headingDeg: null,
      source: null,
      status: "idle",
      error: null,
      follow: false,
    }),
}));
