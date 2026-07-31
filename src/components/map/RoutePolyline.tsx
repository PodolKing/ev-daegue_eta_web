"use client";

import { useEffect, useRef } from "react";
import { useMapStore } from "@/stores/mapStore";
import { useRouteStore } from "@/stores/routeStore";

declare global {
  interface Window {
    Tmapv2: any;
  }
}

/**
 * Draws car-route polyline from routeStore.path onto the TMAP instance.
 * No fetch here — startDirections already loaded path.
 */
export function RoutePolyline() {
  const map = useMapStore((s) => s.map);
  const path = useRouteStore((s) => s.path);
  const polylineRef = useRef<any>(null);

  useEffect(() => {
    if (!map || !window.Tmapv2?.Polyline || !window.Tmapv2?.LatLng) return;

    if (polylineRef.current) {
      try {
        polylineRef.current.setMap(null);
      } catch {
        /* ignore */
      }
      polylineRef.current = null;
    }

    if (!path?.length) return;

    const latLngs = path.map(
      (p) => new window.Tmapv2.LatLng(p.lat, p.lng),
    );

    polylineRef.current = new window.Tmapv2.Polyline({
      path: latLngs,
      strokeColor: "#2563eb",
      strokeWeight: 6,
      map,
    });

    return () => {
      if (polylineRef.current) {
        try {
          polylineRef.current.setMap(null);
        } catch {
          /* ignore */
        }
        polylineRef.current = null;
      }
    };
  }, [map, path]);

  return null;
}
