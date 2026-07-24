export type TmapPlaceResult = {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
};

/**
 * TMAP 장소/주소 검색.
 * @see FEATURES.tmapPlaceSearch — false면 UI에 「미구현」표시.
 * TODO: TMAP POI / 통합검색 API 연동 후 FEATURES.tmapPlaceSearch = true
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
