"use client";

import { useEffect, useState } from "react";
import {
  effectiveChargingPort,
  useCarStore,
} from "@/stores/carStore";

/** Car / plug — 내 차량 포트 필터 */
function CarPortIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      aria-hidden
      fill="none"
      stroke="currentColor"
      strokeWidth="1.85"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M5.5 15.5V11l1.6-4.2A1.5 1.5 0 0 1 8.5 6h7a1.5 1.5 0 0 1 1.4.8L18.5 11v4.5" />
      <path d="M5.5 15.5h13" />
      <circle cx="8" cy="15.5" r="1.6" />
      <circle cx="16" cy="15.5" r="1.6" />
    </svg>
  );
}

/**
 * 내 차량 포트만 보기 on/off.
 * 등록(임시) 차량이 있을 때만 표시 — 시트 펼침 없이 토글.
 */
export function CarPortFilterFab() {
  const primaryCar = useCarStore((s) => s.primaryCar);
  const filterByCarPort = useCarStore((s) => s.filterByCarPort);
  const setFilterByCarPort = useCarStore((s) => s.setFilterByCarPort);
  const port = effectiveChargingPort(primaryCar);
  const [hint, setHint] = useState(false);

  useEffect(() => {
    if (!hint) return;
    const id = window.setTimeout(() => setHint(false), 1400);
    return () => window.clearTimeout(id);
  }, [hint]);

  if (port == null) return null;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => {
          setFilterByCarPort(!filterByCarPort);
          setHint(true);
        }}
        aria-label={
          filterByCarPort ? "내 차량 포트 필터 끄기" : "내 차량 포트만 보기"
        }
        aria-pressed={filterByCarPort}
        title="내 차 포트"
        className={[
          "flex h-10 w-10 items-center justify-center rounded-full border shadow touch-manipulation transition-colors",
          filterByCarPort
            ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]"
            : "border-[var(--border)] bg-white text-[var(--text-secondary)]",
        ].join(" ")}
      >
        <CarPortIcon className="h-5 w-5" />
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
          {filterByCarPort ? `내 차(${port})` : "전체 포트"}
        </span>
      ) : null}
    </div>
  );
}
