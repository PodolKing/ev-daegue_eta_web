"use client";

import type { RadiusKm } from "@/types/station";
import { useMapStore } from "@/stores/mapStore";

const OPTIONS: RadiusKm[] = [3, 5, 10];

export function RadiusControl() {
  const radiusKm = useMapStore((s) => s.radiusKm);
  const setRadiusKm = useMapStore((s) => s.setRadiusKm);

  return (
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
            onClick={() => setRadiusKm(r)}
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
  );
}
