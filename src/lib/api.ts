import type { RadiusKm, StationListResponse } from "@/types/station";

export const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ??
  "http://localhost:8000";

/** UI 반경별 stations limit — 1→50 / 2→100 / 3→200 */
export function limitForRadiusKm(radiusKm: RadiusKm | number): number {
  if (radiusKm <= 1) return 50;
  if (radiusKm <= 2) return 100;
  return 200;
}

export async function fetchStations(params: {
  lat: number;
  lng: number;
  radiusKm: number;
  limit?: number;
}): Promise<StationListResponse> {
  const limit = params.limit ?? limitForRadiusKm(params.radiusKm);
  const q = new URLSearchParams({
    lat: String(params.lat),
    lng: String(params.lng),
    radius_km: String(params.radiusKm),
    limit: String(limit),
  });

  const res = await fetch(`${API_BASE}/api/v1/stations?${q}`, {
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`stations ${res.status}`);
  }
  return res.json() as Promise<StationListResponse>;
}

export async function fetchHealth(): Promise<{ status: string }> {
  const res = await fetch(`${API_BASE}/health`);
  if (!res.ok) throw new Error(`health ${res.status}`);
  return res.json();
}
