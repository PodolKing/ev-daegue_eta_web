"use client";

import { useEffect, useRef } from "react";
import type { RadiusKm } from "@/types/station";
import { useMapStore } from "@/stores/mapStore";
import { useLocationStore } from "@/stores/locationStore";

const OPTIONS: RadiusKm[] = [1, 2, 3];

/** Fixed zoom per radius — circle may clip; prefer “nearby” feel over full-circle fit. */
const ZOOM_BY_RADIUS: Record<RadiusKm, number> = {
  1: 16,
  2: 15,
  3: 14,
};

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
  const setCenter = useMapStore((s) => s.setCenter);
  const coords = useLocationStore((s) => s.coords);

  const circleRef = useRef<any>(null);
  /** null = never user-picked; skip camera change on first map attach. */
  const lastAppliedRadiusRef = useRef<RadiusKm | null>(null);
  const userPickedRadiusRef = useRef(false);

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
      // Stronger tint so radius change reads as coverage, not camera jump
      const fillOpacity =
        radiusKm === 1 ? 0.05 : radiusKm === 2 ? 0.18 : 0.25;

      circleRef.current = new window.Tmapv2.Circle({
        center: centerLatLng,
        radius: radiusKm * 1000,
        strokeColor: "#2563EB",
        strokeWeight: 1.5,
        strokeOpacity: 0.55,
        fillColor: "#3B82F6",
        fillOpacity,
        map,
      });

      // Only adjust camera when user taps 1/2/3 — NOT on first map paint
      const shouldApplyZoom =
        userPickedRadiusRef.current &&
        lastAppliedRadiusRef.current !== radiusKm;

      if (shouldApplyZoom) {
        lastAppliedRadiusRef.current = radiusKm;
        const zoom = ZOOM_BY_RADIUS[radiusKm];

        const runZoom = () => {
          if (typeof map.resize === "function") map.resize();
          if (typeof map.setCenter === "function") {
            map.setCenter(centerLatLng);
          }
          if (typeof map.setZoom === "function") {
            map.setZoom(zoom);
          }
          setCenter({ lat, lng });
          setZoom(zoom);
        };

        window.requestAnimationFrame(runZoom);
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
    setCenter,
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
              onClick={() => {
                userPickedRadiusRef.current = true;
                setRadiusKm(r);
              }}
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
