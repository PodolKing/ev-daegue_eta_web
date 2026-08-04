/** KECO parkingFree: Y=무료, N=유료. */
export type ParkingKind = "free" | "paid";

export function parkingKind(
  value: string | null | undefined,
): ParkingKind | null {
  const v = value?.trim().toUpperCase();
  if (v === "Y") return "free";
  if (v === "N") return "paid";
  return null;
}

export function parkingFreeShort(
  value: string | null | undefined,
): "무료" | "유료" | null {
  const kind = parkingKind(value);
  if (kind === "free") return "무료";
  if (kind === "paid") return "유료";
  return null;
}

/** 목록용 — 글자색만 (배경 없음) */
export function parkingListTextClass(kind: ParkingKind): string {
  return kind === "free"
    ? "text-[var(--success)]"
    : "text-[var(--danger)]";
}

/** 상세 카드용 — 가로 풀폭 바 */
export function parkingBarClass(kind: ParkingKind): string {
  return kind === "free"
    ? "bg-[var(--success-soft)] text-[var(--success)]"
    : "bg-[#fdecec] text-[var(--danger)]";
}
