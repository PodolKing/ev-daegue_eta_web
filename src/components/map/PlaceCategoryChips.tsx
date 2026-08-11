"use client";

import { useState } from "react";
import {
  PLACE_CATEGORY_CHIPS,
  type PlaceCategoryId,
} from "@/lib/map/placeCategories";

export type { PlaceCategoryId };
export { PLACE_CATEGORY_CHIPS };

type PlaceCategoryChipsProps = {
  /** category null = 선택 해제(결과 clear). */
  onSelect?: (id: PlaceCategoryId | null, category: string | null) => void;
  className?: string;
};

/**
 * 검색바 아래 카테고리 칩. API는 부모(MapSearchBar)가 호출.
 */
export function PlaceCategoryChips({
  onSelect,
  className = "",
}: PlaceCategoryChipsProps) {
  const [activeId, setActiveId] = useState<PlaceCategoryId | null>(null);

  return (
    <div
      className={`mt-2 flex gap-1.5 overflow-x-auto overscroll-x-contain pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${className}`}
      role="group"
      aria-label="주변 장소 카테고리"
    >
      {PLACE_CATEGORY_CHIPS.map((chip) => {
        const active = activeId === chip.id;
        return (
          <button
            key={chip.id}
            type="button"
            aria-pressed={active}
            onClick={() => {
              const next = active ? null : chip.id;
              setActiveId(next);
              onSelect?.(next, next ? chip.category : null);
            }}
            className={[
              "shrink-0 rounded-[var(--radius-pill)] border px-2.5 py-1.5",
              "text-[12px] font-semibold tracking-tight touch-manipulation",
              "shadow-[var(--shadow-sm)] backdrop-blur-md transition-colors",
              active
                ? "border-[var(--accent)] bg-[var(--accent)] text-white"
                : "border-[var(--border)] bg-white/95 text-[var(--text-secondary)] hover:bg-white hover:text-[var(--text)] active:bg-[var(--surface-muted)]",
            ].join(" ")}
          >
            {chip.label}
          </button>
        );
      })}
    </div>
  );
}
