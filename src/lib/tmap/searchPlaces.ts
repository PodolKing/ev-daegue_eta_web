import { getApiBase, placeAroundLimitForRadiusKm } from "@/lib/api";

export type TmapPlaceResult = {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  middleBizName?: string | null;
  lowerBizName?: string | null;
  parkFlag?: boolean | null;
};

function isDaeguPlace(place: TmapPlaceResult): boolean {
  const hay = `${place.address ?? ""} ${place.name ?? ""}`;
  return hay.includes("대구");
}

/** 대구 주소·상호를 위로. 타 지역은 제거하지 않고 상대 순서 유지. */
function boostDaeguPlaces(items: TmapPlaceResult[]): TmapPlaceResult[] {
  const daegu: TmapPlaceResult[] = [];
  const other: TmapPlaceResult[] = [];
  for (const item of items) {
    if (isDaeguPlace(item)) daegu.push(item);
    else other.push(item);
  }
  return daegu.concat(other);
}

/**
 * 장소/주소 검색 — BE `GET /api/v1/places/search` (TMAP POI 프록시).
 * center가 있으면 lat/lng만 전달(반경 제한 없음). 결과는 대구 우선 정렬.
 */
export async function searchTmapPlaces(
  query: string,
  center?: { lat: number; lng: number },
): Promise<TmapPlaceResult[]> {
  const q = query.trim();
  if (!q) return [];

  const params = new URLSearchParams({ keyword: q });
  if (center) {
    params.set("lat", String(center.lat));
    params.set("lng", String(center.lng));
  }
  const res = await fetch(`${getApiBase()}/api/v1/places/search?${params}`);
  if (!res.ok) {
    throw new Error(`places search ${res.status}`);
  }
  const items = (await res.json()) as TmapPlaceResult[];
  return boostDaeguPlaces(items);
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
