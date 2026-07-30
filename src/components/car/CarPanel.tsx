"use client";

import { useCarStore } from "@/stores/carStore";

/** 내 차량 패널 뼈대 — 등록·API 연동 전 */
export function CarPanel() {
  const cars = useCarStore((s) => s.cars);
  const filterByCarPort = useCarStore((s) => s.filterByCarPort);
  const setFilterByCarPort = useCarStore((s) => s.setFilterByCarPort);

  return (
    <div className="flex h-full flex-col bg-[var(--surface)] px-3 py-4">
      <h2 className="text-[15px] font-semibold text-[var(--text)]">내 차량</h2>
      <p className="mt-1 text-[12px] text-[var(--text-muted)]">
        {cars.length === 0
          ? "등록된 차량이 없습니다."
          : `${cars.length}대 등록됨`}
      </p>

      <label className="mt-4 flex items-center justify-between gap-2 rounded-[10px] border border-[var(--border)] px-3 py-2.5 text-[13px] text-[var(--text)]">
        <span>내 차량 포트만 보기</span>
        <input
          type="checkbox"
          checked={filterByCarPort}
          onChange={(e) => setFilterByCarPort(e.target.checked)}
          className="h-4 w-4 accent-[var(--accent)]"
        />
      </label>
    </div>
  );
}
