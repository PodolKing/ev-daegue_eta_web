import { getApiBase } from "@/lib/api";

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
