export type Station = {
  stationId: string;
  name: string | null;
  address: string | null;
  lat: number;
  lng: number;
  /** 전체 가용(마커·리스트용 합계) */
  availableCount: number | null;
  /** 그외(비완속) 가용 — 상세 분해용 */
  availableCountOther?: number | null;
  /** 완속(02/08) 가용 — 상세 분해용 */
  availableCountSlow?: number | null;
  distanceKm: number | null;
  chargerTotal?: number | null;
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
