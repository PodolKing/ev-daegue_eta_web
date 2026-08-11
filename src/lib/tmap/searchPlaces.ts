import { getApiBase, placeAroundLimitForRadiusKm } from "@/lib/api";

export type TmapPlaceResult = {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
};

/**
 * 장소/주소 검색 — BE `GET /api/v1/places/search` (TMAP POI 프록시).
 */
export async function searchTmapPlaces(
  query: string,
  _center?: { lat: number; lng: number },
): Promise<TmapPlaceResult[]> {
  const q = query.trim();
  if (!q) return [];

  void _center;

  const params = new URLSearchParams({ keyword: q });
  const res = await fetch(`${getApiBase()}/api/v1/places/search?${params}`);
  if (!res.ok) {
    throw new Error(`places search ${res.status}`);
  }
  return res.json() as Promise<TmapPlaceResult[]>;
}

/**
 * 주변 카테고리 검색 — BE `GET /api/v1/places/around`.
 * count 기본: 반경 1→50 / 2→100 / 3→150
 */
export async function searchTmapPlacesAround(args: {
  categories: string;
  lat: number;
  lng: number;
  radiusKm?: number;
  count?: number;
}): Promise<TmapPlaceResult[]> {
  const radiusKm = args.radiusKm ?? 1;
  const count = args.count ?? placeAroundLimitForRadiusKm(radiusKm);
  const params = new URLSearchParams({
    categories: args.categories,
    lat: String(args.lat),
    lng: String(args.lng),
    radius_km: String(radiusKm),
    count: String(count),
  });
  const res = await fetch(`${getApiBase()}/api/v1/places/around?${params}`);
  if (!res.ok) {
    throw new Error(`places around ${res.status}`);
  }
  return res.json() as Promise<TmapPlaceResult[]>;
}
