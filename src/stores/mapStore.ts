import { create } from "zustand";
import type { RadiusKm, Station } from "@/types/station";

export const DAEGU_CENTER = { lat: 35.8714, lng: 128.6014 };

type MapState = {
  center: { lat: number; lng: number };
  zoom: number;
  radiusKm: RadiusKm;
  stations: Station[];
  selectedId: string | null;
  loading: boolean;
  error: string | null;
  map: any | null; // 👈 Tmap 인스턴스 타입 추가

  setCenter: (c: { lat: number; lng: number }) => void;
  setZoom: (z: number) => void;
  setRadiusKm: (r: RadiusKm) => void;
  setStations: (items: Station[]) => void;
  setSelectedId: (id: string | null) => void;
  setLoading: (v: boolean) => void;
  setError: (e: string | null) => void;
  setMap: (map: any) => void; // 👈 setMap 추가
};

export const useMapStore = create<MapState>((set) => ({
  center: DAEGU_CENTER,
  zoom: 14,
  radiusKm: 3,
  stations: [],
  selectedId: null,
  loading: false,
  error: null,
  map: null, // 👈 초기값 null

  setCenter: (center) => set({ center }),
  setZoom: (zoom) => set({ zoom }),
  setRadiusKm: (radiusKm) => set({ radiusKm }),
  setStations: (stations) => set({ stations }),
  setSelectedId: (selectedId) => set({ selectedId }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  setMap: (map) => set({ map }), // 👈 setter
}));