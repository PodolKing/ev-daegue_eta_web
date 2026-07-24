import type { RadiusKm } from "@/types/station";

export const DEFAULT_MAP_PATH = "/map";

export type MapUrlState = {
  lat: number;
  lng: number;
  zoom: number;
  radius: RadiusKm;
};

const RADIUS_SET = new Set<number>([3, 5, 10]);

/**
 * Build internal returnUrl for OAuth round-trip.
 * Example: `/map?lat=35.87&lng=128.60&zoom=14&radius=3`
 */
export function buildMapReturnUrl(state: MapUrlState): string {
  const q = new URLSearchParams({
    lat: String(state.lat),
    lng: String(state.lng),
    zoom: String(state.zoom),
    radius: String(state.radius),
  });
  return `${DEFAULT_MAP_PATH}?${q.toString()}`;
}

/**
 * Open-redirect guard: only allow relative paths starting with `/map`.
 * TODO: harden (reject `//`, encoded tricks) when wiring OAuth callback.
 */
export function sanitizeReturnUrl(returnUrl: string | null | undefined): string {
  if (!returnUrl) return DEFAULT_MAP_PATH;
  const trimmed = returnUrl.trim();
  if (!trimmed.startsWith(DEFAULT_MAP_PATH)) return DEFAULT_MAP_PATH;
  if (trimmed.startsWith("//")) return DEFAULT_MAP_PATH;
  return trimmed;
}

/**
 * Parse map state from `/map?...` search string or full returnUrl path.
 */
export function parseMapUrlState(
  searchOrReturnUrl: string,
): Partial<MapUrlState> {
  const query = searchOrReturnUrl.includes("?")
    ? searchOrReturnUrl.slice(searchOrReturnUrl.indexOf("?") + 1)
    : searchOrReturnUrl.replace(/^\?/, "");

  const params = new URLSearchParams(query);
  const out: Partial<MapUrlState> = {};

  const lat = Number(params.get("lat"));
  const lng = Number(params.get("lng"));
  const zoom = Number(params.get("zoom"));
  const radius = Number(params.get("radius"));

  if (Number.isFinite(lat)) out.lat = lat;
  if (Number.isFinite(lng)) out.lng = lng;
  if (Number.isFinite(zoom)) out.zoom = zoom;
  if (RADIUS_SET.has(radius)) out.radius = radius as RadiusKm;

  return out;
}

/** Path used when navigating to login while preserving map context. */
export function buildLoginHref(returnUrl: string): string {
  const safe = sanitizeReturnUrl(returnUrl);
  const q = new URLSearchParams({ returnUrl: safe });
  return `/login?${q.toString()}`;
}
