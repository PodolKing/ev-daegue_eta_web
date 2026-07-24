import { create } from "zustand";
import type { RadiusKm, Station } from "@/types/station";

/** Daegu City Hall approx — default map center until geolocation resolves */
export const DAEGU_CENTER = { lat: 35.8714, lng: 128.6014 };

type MapState = {
  center: { lat: number; lng: number };
  zoom: number;
  userLocation: { lat: number; lng: number } | null;
  radiusKm: RadiusKm;
  stations: Station[];
  selectedId: string | null;
  loading: boolean;
  error: string | null;
  setCenter: (c: { lat: number; lng: number }) => void;
  setZoom: (z: number) => void;
  setUserLocation: (c: { lat: number; lng: number } | null) => void;
  setRadiusKm: (r: RadiusKm) => void;
  setStations: (items: Station[]) => void;
  setSelectedId: (id: string | null) => void;
  setLoading: (v: boolean) => void;
  setError: (e: string | null) => void;
};

export const useMapStore = create<MapState>((set) => ({
  center: DAEGU_CENTER,
  zoom: 14,
  userLocation: null,
  radiusKm: 3,
  stations: [],
  selectedId: null,
  loading: false,
  error: null,
  setCenter: (center) => set({ center }),
  setZoom: (zoom) => set({ zoom }),
  setUserLocation: (userLocation) => set({ userLocation }),
  setRadiusKm: (radiusKm) => set({ radiusKm }),
  setStations: (stations) => set({ stations }),
  setSelectedId: (selectedId) => set({ selectedId }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
}));
