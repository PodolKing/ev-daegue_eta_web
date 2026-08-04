export type Charger = {
  chgerId: string;
  /** info.stat_nm */
  statNm?: string | null;
  chgerType?: string | null;
  addr?: string | null;
  addrDetail?: string | null;
  location?: string | null;
  lat?: number | null;
  lng?: number | null;
  useTime?: string | null;
  busiId?: string | null;
  bnm?: string | null;
  busiNm?: string | null;
  busiCall?: string | null;
  output?: number | null;
  method?: string | null;
  zcode?: string | null;
  zscode?: string | null;
  kind?: string | null;
  kindDetail?: string | null;
  parkingFree?: string | null;
  note?: string | null;
  limitYn?: string | null;
  limitDetail?: string | null;
  delYn?: string | null;
  delDetail?: string | null;
  trafficYn?: string | null;
  installYear?: string | null;
  floorNum?: string | null;
  floorType?: string | null;
  /** info.updated_at */
  infoUpdatedAt?: string | null;
  /** KECO status: 1/2/3/4/5/9 — from ev_charger_status */
  chargerStatus?: string | null;
  /** status.last_updated */
  lastUpdated?: string | null;
};

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
  /**
   * 충전기 단위 (목록에 포함, UI 미표시 가능).
   * info 전 컬럼 + status. 가용대수 버튼 → 패널 목록용.
   */
  chargers?: Charger[];
  sourceMode?: string;
  useTime?: string | null;
  busiNm?: string | null;
  busiCall?: string | null;
  outputMin?: number | null;
  outputMax?: number | null;
  limitDetail?: string | null;
  trafficYn?: string | null;
  /** Y=무료주차, N=유료주차 */
  parkingFree?: string | null;
};

export type StationListResponse = {
  items: Station[];
  radiusKm: number;
  limit: number;
  count: number;
};

export type RadiusKm = 1 | 2 | 3;
