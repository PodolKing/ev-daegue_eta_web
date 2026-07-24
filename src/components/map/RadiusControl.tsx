"use client";

import { useEffect, useRef } from "react";
import type { RadiusKm } from "@/types/station";
import { useMapStore } from "@/stores/mapStore";
import { useLocationStore } from "@/stores/locationStore";

const OPTIONS: RadiusKm[] = [1, 3, 5];

declare global {
  interface Window {
    Tmapv2: any;
  }
}

export function RadiusControl() {
  const radiusKm = useMapStore((s) => s.radiusKm);
  const setRadiusKm = useMapStore((s) => s.setRadiusKm);
  const map = useMapStore((s) => s.map);
  const mapCenter = useMapStore((s) => s.center);
  const setZoom = useMapStore((s) => s.setZoom);
  const coords = useLocationStore((s) => s.coords);

  const circleRef = useRef<any>(null);
  const lastFitRadiusRef = useRef<RadiusKm | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !window.Tmapv2 || !map) return;

    const lat = coords?.lat ?? mapCenter.lat;
    const lng = coords?.lng ?? mapCenter.lng;
    if (lat == null || lng == null) return;

    if (circleRef.current) {
      circleRef.current.setMap(null);
      circleRef.current = null;
    }

    const centerLatLng = new window.Tmapv2.LatLng(lat, lng);

    try {
      circleRef.current = new window.Tmapv2.Circle({
        center: centerLatLng,
        radius: radiusKm * 1000,
        strokeColor: "#3B82F6",
        strokeWeight: 2,
        strokeOpacity: 0.8,
        fillColor: "#60A5FA",
        fillOpacity: 0.15,
        map,
      });

      // 반경 변경(또는 최초)일 때만 시야 맞춤 — 현위치 갱신만으로는 줌 유지
      const shouldFit = lastFitRadiusRef.current !== radiusKm;
      if (shouldFit && typeof map.fitBounds === "function") {
        lastFitRadiusRef.current = radiusKm;

        const latOffset = radiusKm / 111;
        const lngOffset =
          radiusKm / (111 * Math.cos((lat * Math.PI) / 180));
        const bounds = new window.Tmapv2.LatLngBounds();
        bounds.extend(
          new window.Tmapv2.LatLng(lat + latOffset, lng + lngOffset),
        );
        bounds.extend(
          new window.Tmapv2.LatLng(lat - latOffset, lng - lngOffset),
        );
        map.fitBounds(bounds);

        window.setTimeout(() => {
          if (typeof map.getZoom === "function") {
            setZoom(map.getZoom());
          }
        }, 100);
      }
    } catch (error) {
      console.error("Circle 생성 실패:", error);
    }

    return () => {
      if (circleRef.current) {
        circleRef.current.setMap(null);
        circleRef.current = null;
      }
    };
  }, [
    coords?.lat,
    coords?.lng,
    mapCenter.lat,
    mapCenter.lng,
    radiusKm,
    map,
    setZoom,
  ]);

  return (
    <div className="flex flex-col items-start gap-1">
      <div
        className="inline-flex rounded-[var(--radius-pill)] border border-[var(--border)] bg-white p-1 shadow-[var(--shadow-sm)]"
        role="group"
        aria-label="검색 반경"
      >
        {OPTIONS.map((r) => {
          const active = r === radiusKm;
          return (
            <button
              key={r}
              type="button"
              onClick={() => setRadiusKm(r)}
              className={[
                "min-w-[52px] rounded-[var(--radius-pill)] px-3 py-1.5 text-[12px] font-semibold transition-colors",
                active
                  ? "bg-[var(--accent)] text-white"
                  : "text-[var(--text-secondary)] hover:bg-[var(--surface-muted)]",
              ].join(" ")}
            >
              {r} km
            </button>
          );
        })}
      </div>
    </div>
  );
}
