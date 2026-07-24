export type Station = {
  stationId: string;
  name: string | null;
  address: string | null;
  lat: number;
  lng: number;
  availableCount: number | null;
  distanceKm: number | null;
  chargerTotal?: number | null;
  sourceMode?: string;
};

export type StationListResponse = {
  items: Station[];
  radiusKm: number;
  limit: number;
  count: number;
};

export type RadiusKm = 3 | 5 | 10;
