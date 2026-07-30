import type { ChargingPort } from "@/types/car";

/**
 * 환경부(KECO) 충전기타입(chgerType) 코드 ↔ 표시명.
 * @see 공공데이터 충전기타입 01–10
 */
export const CHARGER_TYPE_LABELS = {
  "01": "DC차데모",
  "02": "AC완속",
  "03": "DC차데모+AC3상",
  "04": "DC콤보",
  "05": "DC차데모+DC콤보",
  "06": "DC차데모+AC3상+DC콤보",
  "07": "AC3상",
  "08": "DC콤보(완속)",
  "09": "NACS",
  "10": "DC콤보+NACS",
} as const;

export type ChargerTypeCode = keyof typeof CHARGER_TYPE_LABELS;

/** UI 필터 버킷 — 완속 vs 그외 */
export type ChargerTypeBucket = "slow" | "other";

/**
 * 완속으로 취급하는 코드.
 * 02 AC완속 + 08 DC콤보(완속)
 */
export const SLOW_CHARGER_TYPE_CODES: ReadonlySet<string> = new Set([
  "02",
  "08",
]);

/**
 * 차량 충전 포트(어댑터 없음) → 호환 KECO chgerType.
 * - CCS1: DC콤보 계열 (04/05/06/08/10). NACS-only(09) 제외.
 * - CHADEMO: 차데모 계열 (01/03/05/06).
 * - NACS: 09/10만. CCS(04 등)는 어댑터 없이는 비호환.
 */
export const PORT_TO_CHGER_TYPE_CODES: Record<
  ChargingPort,
  ReadonlySet<string>
> = {
  CCS1: new Set(["04", "05", "06", "08", "10"]),
  CHADEMO: new Set(["01", "03", "05", "06"]),
  NACS: new Set(["09", "10"]),
};

export function chgerCodesForChargingPort(
  port: ChargingPort | null | undefined,
): ReadonlySet<string> | null {
  if (port == null) return null;
  return PORT_TO_CHGER_TYPE_CODES[port] ?? null;
}

/**
 * 충전소 chgerType 중 차량 포트와 맞는 코드가 하나라도 있으면 true.
 * 타입 정보 없음 / port 없음 → true (미분류는 통과).
 */
export function stationMatchesCarPort(
  codes: readonly string[] | null | undefined,
  port: ChargingPort | null | undefined,
): boolean {
  const allowed = chgerCodesForChargingPort(port);
  if (!allowed) return true;
  if (!codes?.length) return true;
  return codes.some((c) => {
    const normalized = normalizeChargerTypeCode(c);
    return normalized != null && allowed.has(normalized);
  });
}

export function normalizeChargerTypeCode(
  code: string | null | undefined,
): string | null {
  if (code == null) return null;
  const trimmed = String(code).trim();
  if (!trimmed) return null;
  return trimmed.padStart(2, "0");
}

export function getChargerTypeLabel(
  code: string | null | undefined,
): string {
  const normalized = normalizeChargerTypeCode(code);
  if (!normalized) return "알 수 없음";
  if (normalized in CHARGER_TYPE_LABELS) {
    return CHARGER_TYPE_LABELS[normalized as ChargerTypeCode];
  }
  return `기타(${normalized})`;
}

export function isSlowChargerType(code: string | null | undefined): boolean {
  const normalized = normalizeChargerTypeCode(code);
  if (!normalized) return false;
  return SLOW_CHARGER_TYPE_CODES.has(normalized);
}

export function toChargerTypeBucket(
  code: string | null | undefined,
): ChargerTypeBucket {
  return isSlowChargerType(code) ? "slow" : "other";
}

/** 충전소에 달린 타입 코드들 → 표시용 라벨 목록(중복 제거, 코드 순) */
export function labelsForChargerTypes(
  codes: readonly string[] | null | undefined,
): string[] {
  if (!codes?.length) return [];
  const seen = new Set<string>();
  const labels: string[] = [];
  for (const code of codes) {
    const normalized = normalizeChargerTypeCode(code);
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    labels.push(getChargerTypeLabel(normalized));
  }
  return labels;
}

/** 해당 충전소에 완속(02/08) 충전기가 하나라도 있는지 */
export function stationHasSlowType(
  codes: readonly string[] | null | undefined,
): boolean {
  if (!codes?.length) return false;
  return codes.some((c) => isSlowChargerType(c));
}

/** 해당 충전소에 완속이 아닌 타입(그외)이 하나라도 있는지 */
export function stationHasOtherType(
  codes: readonly string[] | null | undefined,
): boolean {
  if (!codes?.length) return false;
  return codes.some((c) => {
    const normalized = normalizeChargerTypeCode(c);
    return normalized != null && !SLOW_CHARGER_TYPE_CODES.has(normalized);
  });
}

/**
 * 완속 / 그외 토글에 맞는지.
 * 둘 다 true면 전체 통과. 둘 다 false면 아무것도 안 보임.
 */
export function stationMatchesTypeFilter(
  codes: readonly string[] | null | undefined,
  opts: { showSlow: boolean; showOther: boolean },
): boolean {
  if (opts.showSlow && opts.showOther) return true;
  if (!opts.showSlow && !opts.showOther) return false;
  const hasSlow = stationHasSlowType(codes);
  const hasOther = stationHasOtherType(codes);
  if (opts.showSlow && hasSlow) return true;
  if (opts.showOther && hasOther) return true;
  return false;
}

/**
 * 완속 포함 토글 (기본 false = 그외만).
 * - includeSlow true → 전부
 * - false → 그외 타입이 하나라도 있는 충전소 (완속만 있는 곳 숨김)
 * - 타입 정보 없음 → 표시 유지 (미분류)
 */
export function stationMatchesSlowFilter(
  codes: readonly string[] | null | undefined,
  includeSlow: boolean,
): boolean {
  if (includeSlow) return true;
  if (!codes?.length) return true;
  return stationHasOtherType(codes);
}

export function filterStationsBySlowInclude<
  T extends { chargerTypes?: string[] | null },
>(stations: readonly T[], includeSlow: boolean): T[] {
  if (includeSlow) return [...stations];
  return stations.filter((s) =>
    stationMatchesSlowFilter(s.chargerTypes, includeSlow),
  );
}

/**
 * 목록·마커용 가용 대수.
 * - includeSlow true → 전체 availableCount
 * - false → 그외만(availableCountOther). 필드 없으면 합계로 폴백
 */
export function availableCountForSlowFilter(
  station: {
    availableCount: number | null;
    availableCountOther?: number | null;
  },
  includeSlow: boolean,
): number | null {
  if (includeSlow) return station.availableCount;
  if (station.availableCountOther !== undefined) {
    return station.availableCountOther;
  }
  return station.availableCount;
}

/**
 * 마커용 총대수.
 * - includeSlow true → chargerTotal
 * - false → chargerTotalOther. 필드 없으면 전체로 폴백
 */
export function chargerTotalForSlowFilter(
  station: {
    chargerTotal?: number | null;
    chargerTotalOther?: number | null;
  },
  includeSlow: boolean,
): number | null | undefined {
  if (includeSlow) return station.chargerTotal;
  if (station.chargerTotalOther !== undefined) {
    return station.chargerTotalOther;
  }
  return station.chargerTotal;
}

/** 그외+완속 모두 있는 혼합 충전소 */
export function stationIsMixedType(
  codes: readonly string[] | null | undefined,
): boolean {
  return stationHasSlowType(codes) && stationHasOtherType(codes);
}

function formatBucketCount(count: number | null | undefined): string {
  if (count == null) return "—";
  return String(count);
}

/**
 * 상세 카드용 가용 표기.
 * 혼합소 → 그외/완속 분리. 그 외 → 전체 합계 한 줄.
 */
export function detailAvailabilityLines(station: {
  availableCount: number | null;
  availableCountOther?: number | null;
  availableCountSlow?: number | null;
  chargerTypes?: string[] | null;
}): { mixed: boolean; lines: { label: string; value: string; tone: string }[] } {
  const muted = "text-[var(--text-muted)]";
  const warn = "text-[var(--warning)]";
  const ok = "text-[var(--success)]";

  const toneFor = (n: number | null | undefined) => {
    if (n == null) return muted;
    if (n === 0) return warn;
    return ok;
  };

  if (stationIsMixedType(station.chargerTypes)) {
    return {
      mixed: true,
      lines: [
        {
          label: "급속충전 가능",
          value: formatBucketCount(station.availableCountOther),
          tone: toneFor(station.availableCountOther),
        },
        {
          label: "완속충전 가능",
          value: formatBucketCount(station.availableCountSlow),
          tone: toneFor(station.availableCountSlow),
        },
      ],
    };
  }

  const n = station.availableCount;
  if (n === null) {
    return {
      mixed: false,
      lines: [{ label: "상태 미관측", value: "데이터 없음", tone: muted }],
    };
  }
  if (n === 0) {
    return {
      mixed: false,
      lines: [{ label: "충전가능대수 없음", value: "0", tone: warn }],
    };
  }
  return {
    mixed: false,
    lines: [{ label: "충전가능", value: String(n), tone: ok }],
  };
}
