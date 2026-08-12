/** Shared place-category chip ids + TMAP around category strings. */

export const PLACE_CATEGORY_CHIPS = [
  // TMAP around: `TV맛집` empty/non-JSON → use `음식`
  { id: "restaurant", label: "음식점", category: "음식" },
  { id: "cafe", label: "카페", category: "카페" },
  { id: "convenience", label: "편의점", category: "편의점" },
  { id: "parking", label: "주차장", category: "주차장" },
] as const;

export type PlaceCategoryId = (typeof PLACE_CATEGORY_CHIPS)[number]["id"];

/** around API는 bizName이 비는 경우가 많아 칩 라벨로 폴백. */
export function placeCategoryLabel(
  categoryId: PlaceCategoryId | null | undefined,
): string | null {
  if (!categoryId) return null;
  return (
    PLACE_CATEGORY_CHIPS.find((c) => c.id === categoryId)?.label ?? null
  );
}
