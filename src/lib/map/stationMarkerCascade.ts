/**
 * Overlap declutter: nudge display tip south so callout bodies don't stack.
 * Slot order is stable (stationId) — selection must NOT reshuffle positions.
 * Hit-test still uses true station lat/lng.
 */

import { haversineMeters, metersPerCssPixel } from "@/lib/map/stationHit";

/**
 * Callout ~48×38 — collide if tips are within this screen distance
 * OR within MIN_COLLIDE_M on the ground (dense chargers at high zoom).
 * Tuned mild: aggressive values pushed display tips far outside the radius circle.
 */
const COLLIDE_PX = 56;
const MIN_COLLIDE_M = 45;
/** Push each next marker this many CSS px south. */
const STEP_PX = 28;
const MAX_SLOT = 3;

export const MARKER_Z_SOLO = 60;
export const MARKER_Z_TOP = 70;
export const MARKER_Z_SELECTED = 90;
export const MARKER_Z_COVERED = 55;

export type CascadeStation = {
  stationId: string;
  lat: number;
  lng: number;
};

export type CascadeLayout = {
  lat: number;
  lng: number;
  /** Base stack z (before selection bump). */
  zIndex: number;
};

function readZoom(zoom: number): number {
  if (typeof zoom !== "number" || !Number.isFinite(zoom)) return 15;
  return Math.max(1, Math.min(22, zoom));
}

function asFiniteLatLng(s: CascadeStation): CascadeStation | null {
  const lat = Number(s.lat);
  const lng = Number(s.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { stationId: s.stationId, lat, lng };
}

/**
 * Stable south cascade by stationId. Does not depend on selection.
 */
export function cascadeMarkerLayout(
  stations: readonly CascadeStation[],
  zoom: number,
): Map<string, CascadeLayout> {
  const out = new Map<string, CascadeLayout>();
  const list: CascadeStation[] = [];
  for (const raw of stations) {
    const s = asFiniteLatLng(raw);
    if (!s) continue;
    list.push(s);
    out.set(s.stationId, {
      lat: s.lat,
      lng: s.lng,
      zIndex: MARKER_Z_SOLO,
    });
  }
  if (list.length < 2) return out;

  const z = readZoom(zoom);
  const avgLat = list.reduce((sum, s) => sum + s.lat, 0) / list.length;
  const mPerPx = metersPerCssPixel(avgLat, z);
  if (!Number.isFinite(mPerPx) || mPerPx <= 0) return out;

  const collideM = Math.max(MIN_COLLIDE_M, COLLIDE_PX * mPerPx);
  const stepLat = (STEP_PX * mPerPx) / 111_320;
  if (!Number.isFinite(stepLat) || stepLat === 0) return out;

  const n = list.length;
  const parent = Array.from({ length: n }, (_, i) => i);
  const find = (i: number): number => {
    let x = i;
    while (parent[x] !== x) {
      parent[x] = parent[parent[x]];
      x = parent[x];
    }
    return x;
  };
  const union = (a: number, b: number) => {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent[rb] = ra;
  };

  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      if (haversineMeters(list[i], list[j]) < collideM) {
        union(i, j);
      }
    }
  }

  const groups = new Map<number, number[]>();
  for (let i = 0; i < n; i++) {
    const root = find(i);
    const bucket = groups.get(root);
    if (bucket) bucket.push(i);
    else groups.set(root, [i]);
  }

  for (const idxs of groups.values()) {
    if (idxs.length < 2) continue;

    // Stable order only — never prefer selected (avoids click reshuffle).
    idxs.sort((a, b) =>
      list[a].stationId.localeCompare(list[b].stationId),
    );

    idxs.forEach((i, slot) => {
      const s = list[i];
      const useSlot = Math.min(slot, MAX_SLOT);
      out.set(s.stationId, {
        lat: s.lat - useSlot * stepLat,
        lng: s.lng,
        zIndex:
          slot === 0
            ? MARKER_Z_TOP
            : MARKER_Z_COVERED - Math.min(slot, 5),
      });
    });
  }

  return out;
}

export function markerZForSelection(
  baseZ: number,
  selected: boolean,
): number {
  return selected ? MARKER_Z_SELECTED : baseZ;
}

/** Prefer live map zoom when available. */
export function zoomFromMap(map: unknown, fallback: number): number {
  try {
    const m = map as { getZoom?: () => number };
    if (typeof m?.getZoom === "function") {
      const z = m.getZoom();
      if (typeof z === "number" && Number.isFinite(z)) return z;
    }
  } catch {
    /* ignore */
  }
  return readZoom(fallback);
}
