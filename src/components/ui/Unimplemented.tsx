"use client";

import type { ReactNode } from "react";

/** 미구현 기능을 버그로 착각하지 않도록 눈에 띄게 표시 */
export function UnimplementedBadge({
  label = "미구현",
  className = "",
}: {
  label?: string;
  className?: string;
}) {
  return (
    <span
      className={[
        "inline-flex shrink-0 items-center rounded-full border border-amber-300 bg-amber-50 px-1.5 py-0.5 text-[10px] font-bold tracking-tight text-amber-800",
        className,
      ].join(" ")}
    >
      {label}
    </span>
  );
}

export function UnimplementedHint({ children }: { children: ReactNode }) {
  return (
    <div className="mx-3 mb-3 rounded-[var(--radius-md)] border border-dashed border-amber-300 bg-amber-50/90 px-3 py-2.5 text-[12px] leading-relaxed text-amber-950">
      <p className="font-bold text-amber-900">아직 구현되지 않았습니다</p>
      <p className="mt-1 text-amber-900/80">{children}</p>
    </div>
  );
}
