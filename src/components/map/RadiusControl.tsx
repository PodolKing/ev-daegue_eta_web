"use client";

import type { RadiusKm } from "@/types/station";
import { useMapStore } from "@/stores/mapStore";
import { FEATURES } from "@/lib/features";
import { UnimplementedBadge } from "@/components/ui/Unimplemented";

const OPTIONS: RadiusKm[] = [3, 5, 10];

/**
 * 반경 UI 뼈대 (3 / 5 / 10 km).
 * - 스토어 `radiusKm`만 갱신 (stations 재조회는 AppShell이 반응).
 * - BE Haversine·지도 반경원 등은 TODO — FEATURES.radiusFilter.
 */
export function RadiusControl() {
  const radiusKm = useMapStore((s) => s.radiusKm);
  const setRadiusKm = useMapStore((s) => s.setRadiusKm);

  const onSelect = (r: RadiusKm) => {
    setRadiusKm(r);
    // TODO: 지도에 반경 원/줌 맞춤 (선택)
    // TODO: BE stations radiusKm 필터 실동작 확인 (FEATURES.radiusFilter)
  };

  return (
    <div className="flex flex-col items-start gap-1">
      <div
        className="inline-flex rounded-[var(--radius-pill)] border border-[var(--border)] bg-white p-1 shadow-[var(--shadow-sm)]"
        role="group"
        aria-label="검색 반경"
      >
        {OPTIONS.map((r) => {
          const active = r === radiusKm;
          return (
            <button
              key={r}
              type="button"
              onClick={() => onSelect(r)}
              className={[
                "min-w-[52px] rounded-[var(--radius-pill)] px-3 py-1.5 text-[12px] font-semibold transition-colors",
                active
                  ? "bg-[var(--accent)] text-white"
                  : "text-[var(--text-secondary)] hover:bg-[var(--surface-muted)]",
              ].join(" ")}
            >
              {r} km
            </button>
          );
        })}
      </div>
      {!FEATURES.radiusFilter && (
        <UnimplementedBadge label="반경필터 미구현" />
      )}
    </div>
  );
}
