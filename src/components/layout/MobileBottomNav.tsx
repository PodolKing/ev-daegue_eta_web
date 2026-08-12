"use client";

import { MAIN_NAV, type NavId } from "@/components/layout/IconRail";

/** 모바일 전용 하단 네비 — PC IconRail 대체. */
export function MobileBottomNav({
  active = "map",
  onSelect,
}: {
  active?: NavId;
  onSelect?: (id: NavId) => void;
}) {
  return (
    <nav
      className="flex shrink-0 items-stretch border-t border-[var(--border)] bg-[var(--surface)] pb-[env(safe-area-inset-bottom,0px)]"
      aria-label="주 메뉴"
    >
      {MAIN_NAV.map((item) => {
        const isActive = item.id === active;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelect?.(item.id)}
            aria-current={isActive ? "page" : undefined}
            className={[
              "flex min-h-12 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 px-0.5 py-1.5 touch-manipulation transition-colors",
              isActive
                ? "text-[var(--accent)]"
                : "text-[var(--text-muted)]",
            ].join(" ")}
          >
            <span
              className={[
                "flex h-8 w-8 items-center justify-center rounded-[10px]",
                isActive ? "bg-[var(--accent-soft)]" : "",
              ].join(" ")}
            >
              {item.icon}
            </span>
            <span className="max-w-full truncate text-[10px] font-medium leading-tight">
              {item.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
