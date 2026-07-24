import type { StationListResponse } from "@/types/station";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ??
  "http://localhost:8000";

export async function fetchStations(params: {
  lat: number;
  lng: number;
  radiusKm: number;
  limit?: number;
}): Promise<StationListResponse> {
  const q = new URLSearchParams({
    lat: String(params.lat),
    lng: String(params.lng),
    radius_km: String(params.radiusKm),
    limit: String(params.limit ?? 50),
  });

  const res = await fetch(`${API_BASE}/api/v1/stations?${q}`);
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
