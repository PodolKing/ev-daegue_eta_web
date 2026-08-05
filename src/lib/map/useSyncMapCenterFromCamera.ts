"use client";

import { useEffect } from "react";
import { haversineMeters } from "@/lib/map/stationHit";
import { useMapStore } from "@/stores/mapStore";

const MAP_ELEMENT_ID = "ev-tmap-map";
/** Ignore sub-meter noise when syncing camera → store */
const SYNC_MIN_M = 1;

function readMapCenter(map: {
  getCenter?: () => { lat: () => number; lng: () => number };
}): { lat: number; lng: number } | null {
  try {
    if (typeof map.getCenter !== "function") return null;
    const c = map.getCenter();
    if (!c || typeof c.lat !== "function" || typeof c.lng !== "function") {
      return null;
    }
    return { lat: c.lat(), lng: c.lng() };
  } catch {
    return null;
  }
}

/**
 * Keep mapStore.center in sync with the live TMAP camera.
 * MapView bootstrap dragend can miss touch pans; read getCenter on pointerup + dragend.
 * Does not touch createMap / loadSdk / RadiusControl.
 */
export function useSyncMapCenterFromCamera() {
  const map = useMapStore((s) => s.map);

  useEffect(() => {
    if (!map) return;
    const el = document.getElementById(MAP_ELEMENT_ID);
    const setCenter = useMapStore.getState().setCenter;

    const sync = () => {
      const next = readMapCenter(map);
      if (!next) return;
      const prev = useMapStore.getState().center;
      if (haversineMeters(prev, next) < SYNC_MIN_M) return;
      setCenter(next);
    };

    const cap: AddEventListenerOptions = { capture: true, passive: true };
    if (el) {
      el.addEventListener("pointerup", sync, cap);
      el.addEventListener("touchend", sync, cap);
    }

    let dragHandled = false;
    if (typeof window !== "undefined" && window.Tmapv2?.Event?.addListener) {
      window.Tmapv2.Event.addListener(map, "dragend", sync);
      dragHandled = true;
    } else if (typeof map.addListener === "function") {
      map.addListener("dragend", sync);
      dragHandled = true;
    }

    return () => {
      if (el) {
        el.removeEventListener("pointerup", sync, true);
        el.removeEventListener("touchend", sync, true);
      }
      // TMAP often has no removeListener; leaving duplicate on remount is rare (map identity).
      void dragHandled;
    };
  }, [map]);
}

/** Live camera center — prefer map instance over possibly stale store. */
export function readLiveMapCenter(): { lat: number; lng: number } {
  const { map, center } = useMapStore.getState();
  if (map) {
    const live = readMapCenter(map);
    if (live) return live;
  }
  return center;
}
