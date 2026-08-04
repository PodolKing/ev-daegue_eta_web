/** POST /api/v1/recommendations — request (camelCase) */
export type RecommendRequest = {
  destLat: number;
  destLng: number;
  etaMinutes: number;
  radiusKm?: number;
  topK?: number;
  arrivalAt?: string | null;
  mode?: "external" | "home";
  registeredStatIds?: string[] | null;
  originLat?: number | null;
  originLng?: number | null;
  currentSoc?: number | null;
  vehicleModelId?: string | null;
  minOutputKw?: number | null;
  includeSlow?: boolean;
};
export type RecommendParking = {
  pkltId?: string | null;
  parkingNm?: string | null;
  totalSpaces?: number | null;
  remainingSpaces?: number | null;
  occupancyRate?: number | null;
  congestionStatus?: string | null;
  feeType?: string | null;
  is24h?: boolean | null;
};
export type RecommendItem = {
  rank?: number | null;
  statId: string;
  statNm?: string | null;
  addr?: string | null;
  lat: number;
  lng: number;
  distanceM?: number | null;
  recommendationScore?: number | null;
  recommendationLabel?: string | null;
  scoreBreakdown?: Record<string, unknown> | null;
  accessCoefficient?: number | null;
  avgAvailableProb?: number | null;
  score?: number | null;
  detourMinutes?: number | null;
  extraDistanceKm?: number | null;
  arrivalSocPct?: number | null;
  /** 있을 때만 — 키 없으면 undefined */
  parking?: RecommendParking;
};
export type RecommendMeta = {
  modelVersion?: string | null;
  requestId?: string | null;
  confidenceLevel?: string | null;
  radiusExpanded?: boolean | null;
  radiusNote?: string | null;
  horizonNote?: string | null;
  remainingModel?: boolean | null;
};
export type RecommendResponse = {
  meta?: RecommendMeta | null;
  recommendations: RecommendItem[];
};
