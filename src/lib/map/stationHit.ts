import type { Station } from "@/types/station";

/**
 * Legacy default (zoom≈16 근처). 실제 탭은 stationHitMaxM / ForMap 사용.
 * @deprecated prefer stationHitMaxMForMap
 */
export const STATION_HIT_MAX_M = 80;

/** 손가락 탭 목표 크기(CSS px). 폴드·고DPI에서도 비슷한 체감. */
const HIT_TARGET_PX = 44;
const HIT_MIN_M = 50;
const HIT_MAX_M = 200;

/** Web Mercator: 해당 lat/zoom에서 CSS 1px ≈ 몇 m */
export function metersPerCssPixel(lat: number, zoom: number): number {
  const z = Math.max(1, Math.min(22, zoom));
  return (
    (156543.03392 * Math.cos((lat * Math.PI) / 180)) / Math.pow(2, z)
  );
}

/**
 * 줌·위도에 맞춘 충전소 탭 허용 반경(m).
 * 줌아웃 → 넓게(잘 안 잡힘 완화), 줌인 → 좁게(옆 충전소 오선택 완화).
 */
export function stationHitMaxM(lat: number, zoom: number): number {
  const m = metersPerCssPixel(lat, zoom) * HIT_TARGET_PX;
  return Math.min(HIT_MAX_M, Math.max(HIT_MIN_M, m));
}

/** TMAP map.getZoom() 있으면 사용, 없으면 15. */
export function stationHitMaxMForMap(map: unknown, lat: number): number {
  let zoom = 15;
  try {
    const m = map as { getZoom?: () => number };
    if (typeof m?.getZoom === "function") {
      const z = m.getZoom();
      if (typeof z === "number" && Number.isFinite(z)) zoom = z;
    }
  } catch {
    /* keep default */
  }
  return stationHitMaxM(lat, zoom);
}

export function haversineMeters(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function nearestStation(
  stations: Station[],
  lat: number,
  lng: number,
  maxM: number = STATION_HIT_MAX_M,
): Station | null {
  const hit = nearestLatLngItem(stations, lat, lng, maxM);
  return hit?.item ?? null;
}

/** 탭 hit-test용 — 거리(m) 포함 (충전소 vs 카테고리 POI 우선순위). */
export function nearestLatLngItem<T extends { lat: number; lng: number }>(
  items: readonly T[],
  lat: number,
  lng: number,
  maxM: number = STATION_HIT_MAX_M,
): { item: T; distanceM: number } | null {
  let best: T | null = null;
  let bestD = maxM;
  for (const s of items) {
    const d = haversineMeters({ lat, lng }, s);
    if (d < bestD) {
      bestD = d;
      best = s;
    }
  }
  return best ? { item: best, distanceM: bestD } : null;
}
