/** Shared map / search / future-nav coordinate */
export type LatLng = {
  lat: number;
  lng: number;
};

/**
 * Where the current position comes from.
 * - gps: browser Geolocation (`locateOnce` / `watchPosition`)
 * - test: driving-test fake point (`setTestCoords`) — not real GPS
 */
export type LocationSource = "gps" | "test";

/**
 * Location pipeline status (`locationStore`).
 * - idle: no fix yet
 * - locating: one-shot `getCurrentPosition` in flight
 * - ready: have coords, not continuously tracking
 * - watching: `watchPosition` active (real GPS follow)
 * - error: last request failed
 *
 * Camera chase is separate (`follow` in store) — watching ≠ map follow.
 * Product needs an explicit way to stop watching (vehicle / battery / free pan).
 */
export type LocationStatus =
  | "idle"
  | "locating"
  | "ready"
  | "watching"
  | "error";

/**
 * How the “현위치” point is driven (product modes; store wiring later).
 * - off: no continuous GPS; last coords (or map center) for radius origin
 * - watch: real GPS → `coords`
 * - test: fake GPS — map tap (mobile) or marker drag (desktop)
 */
export type LocationDriveMode = "off" | "watch" | "test";
