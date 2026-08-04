"use client";

/** 즐겨찾기 패널 — 제목만 (목록·API 연동 전) */
export function FavoritesPanel() {
  return (
    <div className="ev-scroll-panel flex h-full min-h-0 flex-col overflow-y-auto bg-[var(--surface)] px-3 py-3">
      <h2 className="text-[14px] font-semibold text-[var(--text)]">즐겨찾기</h2>
    </div>
  );
}
