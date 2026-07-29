"use client";

import { useEffect, useState } from "react";
import { useMapStore } from "@/stores/mapStore";

/** Plug icon — 완속 포함 토글 */
function SlowPlugIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      aria-hidden
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 22v-5" />
      <path d="M9 8V2" />
      <path d="M15 8V2" />
      <path d="M18 8v5a6 6 0 0 1-12 0V8Z" />
    </svg>
  );
}

/**
 * 완속 충전기 포함 on/off.
 * 기본 off = 그외(급속 등)만. 탭 시 짧게 「완속」 라벨.
 */
export function SlowChargeFilterFab() {
  const includeSlow = useMapStore((s) => s.includeSlow);
  const setIncludeSlow = useMapStore((s) => s.setIncludeSlow);
  const [hint, setHint] = useState(false);

  useEffect(() => {
    if (!hint) return;
    const id = window.setTimeout(() => setHint(false), 1400);
    return () => window.clearTimeout(id);
  }, [hint]);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => {
          setIncludeSlow(!includeSlow);
          setHint(true);
        }}
        aria-label={includeSlow ? "완속 포함 끄기" : "완속 포함 켜기"}
        aria-pressed={includeSlow}
        title="완속"
        className={[
          "flex h-10 w-10 items-center justify-center rounded-full border shadow touch-manipulation transition-colors",
          includeSlow
            ? "border-[var(--success)] bg-[var(--success-soft)] text-[var(--success)]"
            : "border-[var(--border)] bg-white text-[var(--text-secondary)]",
        ].join(" ")}
      >
        <SlowPlugIcon className="h-5 w-5" />
      </button>
      {hint ? (
        <span
          className="
            pointer-events-none
            absolute
            left-full
            top-1/2
            z-10
            ml-2
            -translate-y-1/2
            whitespace-nowrap
            rounded-[var(--radius-pill)]
            border
            border-[var(--border)]
            bg-white
            px-2.5
            py-1
            text-[11px]
            font-semibold
            text-[var(--text)]
            shadow-[var(--shadow-sm)]
            animate-fade-up
          "
          role="status"
        >
          완속 {includeSlow ? "포함" : "숨김"}
        </span>
      ) : null}
    </div>
  );
}
