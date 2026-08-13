import type { RadiusKm, StationListResponse } from "@/types/station";
import type { RecommendRequest, RecommendResponse } from "@/types/recommend";
import type { Car, CarModel, ChargingPort } from "@/types/car";

/**
 * True for typical phone→PC LAN hosts (private IPv4).
 * Not true for Vercel / custom domains — those must use NEXT_PUBLIC_API_BASE_URL.
 */

const ACCESS_TOKEN_KEY = "accessToken";
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

/**
 * 즐겨찾기 FE 클라이언트.
 * - authStore를 이 파일에서 import하지 말 것 (순환). 401/403은 토큰만 지움.
 * - 10개 한도는 HTTP 200 + processed:false. throw하지 않음.
 * - GET /status/{stationId}는 1차 불필요 (list hydrate).
 */
export type FavoriteSort = "recent" | "name";

export type FavoriteItem = {
  id: number;
  stationId: string;
  name: string | null;
  address: string | null;
  lat: number | null;
  lng: number | null;
  memo: string | null;
  /** 관측 없으면 null. charger_status=2 대수. stations와 동일. */
  availableCount: number | null;
  createdAt: string;
  lastUsedAt: string;
};

export type FavoriteListResponse = {
  items: FavoriteItem[];
  count: number;
};

export type FavoriteMutationResponse = {
  processed: boolean;
  isFavorite: boolean;
  favoriteCount: number;
  code: string;
  message: string;
};

export class FavoriteAuthError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = "FavoriteAuthError";
    this.status = status;
  }
}

function readAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

function clearAccessToken(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(ACCESS_TOKEN_KEY);
}

/** 보호 API용. 토큰 없으면 빈 객체. */
export function authHeaders(): HeadersInit {
  const token = readAccessToken();
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
}

function requireAccessToken(): void {
  if (!readAccessToken()) {
    throw new FavoriteAuthError(401, "인증 필요");
  }
}

async function parseFavoriteError(res: Response, fallback: string): Promise<never> {
  // 즐겨찾기 Depends는 401. 403은 무효 세션을 안 남기기 위한 여분.
  // authStore.clear는 호출측(favoriteStore)에서.
  if (res.status === 401 || res.status === 403) {
    clearAccessToken();
    throw new FavoriteAuthError(res.status, "인증 필요");
  }
  const text = await res.text().catch(() => "");
  let detail = text;
  try {
    const parsed = JSON.parse(text) as { detail?: unknown };
    if (typeof parsed.detail === "string" && parsed.detail.trim()) {
      detail = parsed.detail.trim();
    }
  } catch {
    /* raw body */
  }
  throw new Error(detail || `${fallback} ${res.status}`);
}

export async function fetchFavoriteList(
  sort: FavoriteSort = "recent",
): Promise<FavoriteListResponse> {
  requireAccessToken();
  const q = new URLSearchParams({ sort });
  const res = await fetch(`${getApiBase()}/api/v1/favorites/list?${q}`, {
    headers: authHeaders(),
    cache: "no-store",
  });
  if (!res.ok) {
    await parseFavoriteError(res, "favorites list");
  }
  return res.json() as Promise<FavoriteListResponse>;
}

export async function toggleFavoriteApi(body: {
  stationId: string;
  memo?: string | null;
}): Promise<FavoriteMutationResponse> {
  requireAccessToken();
  const payload: { stationId: string; memo?: string } = {
    stationId: body.stationId,
  };
  const memo = body.memo?.trim();
  if (memo) payload.memo = memo;

  const res = await fetch(`${getApiBase()}/api/v1/favorites/toggle`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
    },
    body: JSON.stringify(payload),
    cache: "no-store",
  });
  if (!res.ok) {
    await parseFavoriteError(res, "favorites toggle");
  }
  return res.json() as Promise<FavoriteMutationResponse>;
}
export type CarListResponse = {
  items: Car[];
  count: number;
};
export type CarModelsResponse = {
  items: CarModel[];
  count: number;
};
export type CarCreateBody = {
  carModelId?: number | null;
  carNumber?: string | null;
  customModelName?: string | null;
  chargingPort?: ChargingPort | null;
  isPrimary?: boolean;
};
type CarApiRow = Omit<Car, "carModel"> & {
  model?: CarModel | null;
};
function toCar(row: CarApiRow): Car {
  return {
    id: row.id,
    carModelId: row.carModelId,
    carNumber: row.carNumber,
    chargingPort: row.chargingPort,
    isPrimary: row.isPrimary,
    customModelName: row.customModelName,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    carModel: row.model ?? null,
  };
}
function toCarModel(row: CarModel): CarModel {
  return {
    id: row.id,
    manufacturer: row.manufacturer,
    modelName: row.modelName,
    fuelType: row.fuelType,
    chargingPort: row.chargingPort,
    batteryCapacity: row.batteryCapacity ?? null,
  };
}
export async function fetchCarModels(): Promise<CarModelsResponse> {
  requireAccessToken();
  const res = await fetch(`${getApiBase()}/api/v1/cars/models`, {
    headers: authHeaders(),
    cache: "no-store",
  });
  if (!res.ok) {
    await parseFavoriteError(res, "cars models");
  }
  const data = (await res.json()) as CarModelsResponse;
  return {
    items: (data.items ?? []).map(toCarModel),
    count: data.count,
  };
}
export async function fetchMyCars(): Promise<CarListResponse> {
  requireAccessToken();
  const res = await fetch(`${getApiBase()}/api/v1/cars/listCar`, {
    headers: authHeaders(),
    cache: "no-store",
  });
  if (!res.ok) {
    await parseFavoriteError(res, "cars list");
  }
  const data = (await res.json()) as { items: CarApiRow[]; count: number };
  const items = (data.items ?? []).map(toCar);
  return { items, count: data.count };
}
export async function createCarApi(body: CarCreateBody): Promise<Car> {
  requireAccessToken();
  const res = await fetch(`${getApiBase()}/api/v1/cars/createCar`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  if (!res.ok) {
    await parseFavoriteError(res, "cars create");
  }
  return toCar((await res.json()) as CarApiRow);
}
export async function setPrimaryCarApi(
  carId: number,
  isPrimary: boolean,
): Promise<Car> {
  requireAccessToken();
  const res = await fetch(`${getApiBase()}/api/v1/cars/setPrimary/${carId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
    },
    body: JSON.stringify({ isPrimary }),
    cache: "no-store",
  });
  if (!res.ok) {
    await parseFavoriteError(res, "cars setPrimary");
  }
  return toCar((await res.json()) as CarApiRow);
}
export async function deleteCarApi(carId: number): Promise<void> {
  requireAccessToken();
  const res = await fetch(`${getApiBase()}/api/v1/cars/deleteCar/${carId}`, {
    method: "DELETE",
    headers: authHeaders(),
    cache: "no-store",
  });
  if (!res.ok) {
    await parseFavoriteError(res, "cars delete");
  }
}
export type StationSearchItem = {
  stationId: string;
  name: string | null;
  address: string | null;
  lat: number;
  lng: number;
  availableCount: number | null;
};

export async function searchStations(q: string, limit = 20) {
  const query = q.trim();
  if (query.length < 2) {
    return { items: [] as StationSearchItem[], query, limit, count: 0 };
  }
  const params = new URLSearchParams({ q: query, limit: String(limit) });
  const res = await fetch(
    `${getApiBase()}/api/v1/stations/search?${params}`,
    { cache: "no-store" },
  );
  if (!res.ok) throw new Error(`stations search ${res.status}`);
  return res.json() as Promise<{
    items: StationSearchItem[];
    query: string;
    limit: number;
    count: number;
  }>;
}