/** Shared place-category chip ids + TMAP around category strings. */

export const PLACE_CATEGORY_CHIPS = [
  // TMAP around: `TV맛집` empty/non-JSON → use `음식`
  { id: "restaurant", label: "맛집", category: "음식" },
  { id: "cafe", label: "카페", category: "카페" },
  { id: "convenience", label: "편의점", category: "편의점" },
  { id: "parking", label: "주차장", category: "주차장" },
] as const;

export type PlaceCategoryId = (typeof PLACE_CATEGORY_CHIPS)[number]["id"];
