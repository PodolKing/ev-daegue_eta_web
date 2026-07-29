export type Station = {
  stationId: string;
  name: string | null;
  address: string | null;
  lat: number;
  lng: number;
  /** 전체 가용(완속 포함 시 목록·마커) */
  availableCount: number | null;
  /** 그외(비완속) 가용 — 완속 제외 시 목록·마커 + 상세 분해 */
  availableCountOther?: number | null;
  /** 완속(02/08) 가용 — 상세 분해용 */
  availableCountSlow?: number | null;
  distanceKm: number | null;
  /** 전체 충전기 대수(완속 포함 시 마커 분모) */
  chargerTotal?: number | null;
  /** 그외(비완속) 대수 — 완속 제외 시 마커 분모. 완속 총 = total − other */
  chargerTotalOther?: number | null;
  /** KECO chgerType codes at this station, e.g. ["02","04"] */
  chargerTypes?: string[];
  sourceMode?: string;
};

export type StationListResponse = {
  items: Station[];
  radiusKm: number;
  limit: number;
  count: number;
};

export type RadiusKm = 1 | 2 | 3;
