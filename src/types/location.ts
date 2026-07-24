/** Shared map / search / future-nav coordinate */
export type LatLng = {
  lat: number;
  lng: number;
};

/** Where the current position comes from */
export type LocationSource = "gps" | "test";

export type LocationStatus =
  | "idle"
  | "locating"
  | "ready"
  | "watching"
  | "error";
