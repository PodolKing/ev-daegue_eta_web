import type { RadiusKm, StationListResponse } from "@/types/station";
import type { RecommendRequest, RecommendResponse } from "@/types/recommend";

/**
 * True for typical phone→PC LAN hosts (private IPv4).
 * Not true for Vercel / custom domains — those must use NEXT_PUBLIC_API_BASE_URL.
 */
export function isPrivateLanHostname(host: string): boolean {
  const m = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(host.trim());
  if (!m) return false;
  const octets = [Number(m[1]), Number(m[2]), Number(m[3]), Number(m[4])];
  if (octets.some((n) => !Number.isInteger(n) || n > 255)) return false;
  const [a, b] = octets;
  if (a === 10) return true;
  if (a === 192 && b === 168) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  return false;
}

/**
 * API base for browser calls.
 * - localhost / 127.0.0.1 → NEXT_PUBLIC_API_BASE_URL (default http://localhost:8000)
 * - private LAN IP (phone Wi‑Fi) → http://{page-host}:8000 (DHCP-friendly)
 * - otherwise (Vercel, custom domain) → NEXT_PUBLIC_API_BASE_URL (Render HTTPS)
 */
export function getApiBase(): string {
  const fromEnv = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "");
  if (typeof window !== "undefined") {
    const host = window.location.hostname;
    if (isPrivateLanHostname(host)) {
      return `http://${host}:8000`;
    }
  }
  return fromEnv ?? "http://localhost:8000";
}

/** @deprecated Prefer getApiBase() — static env snapshot (no LAN auto-host). */
export const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ??
  "http://localhost:8000";

/** UI 반경별 stations limit — 1→50 / 2→100 / 3→200 */
export function limitForRadiusKm(radiusKm: RadiusKm | number): number {
  if (radiusKm <= 1) return 50;
  if (radiusKm <= 2) return 100;
  return 200;
}

/** 카테고리 around limit — 1→50 / 2→100 / 3→150 */
export function placeAroundLimitForRadiusKm(
  radiusKm: RadiusKm | number,
): number {
  if (radiusKm <= 1) return 50;
  if (radiusKm <= 2) return 100;
  return 150;
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

  const res = await fetch(`${getApiBase()}/api/v1/stations?${q}`, {
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`stations ${res.status}`);
  }
  return res.json() as Promise<StationListResponse>;
}

export async function fetchHealth(): Promise<{ status: string }> {
  const res = await fetch(`${getApiBase()}/health`);
  if (!res.ok) throw new Error(`health ${res.status}`);
  return res.json();
}
/** AI 충전소 추천 — BE 프록시 → 외부 모델 */
export async function fetchRecommendations(
  body: RecommendRequest,
): Promise<RecommendResponse> {
  const res = await fetch(`${getApiBase()}/api/v1/recommendations`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(
      detail
        ? `recommendations ${res.status}: ${detail}`
        : `recommendations ${res.status}`,
    );
  }
  return res.json() as Promise<RecommendResponse>;
}