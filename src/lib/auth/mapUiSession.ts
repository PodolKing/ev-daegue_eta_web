const STORAGE_KEY = "ev-safecharge.mapUi";

export type MapUiSession = {
  selectedMarker: string | null;
  openPanel: boolean;
  filterOption: string | null;
  savedAt: number;
};

/**
 * Persist non-critical UI state across OAuth redirect.
 * TODO: skip restore when `Date.now() - savedAt` exceeds TTL (5–30 min).
 */
export function saveMapUiSession(payload: Omit<MapUiSession, "savedAt">): void {
  if (typeof window === "undefined") return;
  const data: MapUiSession = { ...payload, savedAt: Date.now() };
  // TODO: implement sessionStorage write
  void data;
  void STORAGE_KEY;
}

/**
 * TODO: read sessionStorage, enforce TTL, return null if expired/missing.
 */
export function loadMapUiSession(): MapUiSession | null {
  if (typeof window === "undefined") return null;
  // TODO: implement sessionStorage read + TTL check
  return null;
}

export function clearMapUiSession(): void {
  if (typeof window === "undefined") return;
  // TODO: sessionStorage.removeItem(STORAGE_KEY)
}
