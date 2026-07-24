export type TmapPlaceResult = {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
};

/**
 * TMAP 장소/주소 검색.
 * TODO: TMAP POI / 통합검색 API 연동 (FE SDK 또는 BE 프록시).
 * 키는 FE 지도용 `NEXT_PUBLIC_TMAP_APP_KEY` 또는 BE `TMAP_APP_KEY` 정책에 맞게.
 */
export async function searchTmapPlaces(
  query: string,
  _center?: { lat: number; lng: number },
): Promise<TmapPlaceResult[]> {
  const q = query.trim();
  if (!q) return [];

  // TODO: call TMAP search API, map response → TmapPlaceResult[]
  void _center;
  return [];
}
