"use client";

import { BodyPortal } from "@/components/auth/BodyPortal";
import { useFavoriteStore } from "@/stores/favoriteStore";

/**
 * 즐겨찾기 한도·처리 실패 안내. window.alert 대신 사용.
 * 모바일 시트 transform 안에 갇히지 않게 body 포탈.
 */
export function FavoriteNoticeSheet() {
  const notice = useFavoriteStore((s) => s.notice);
  const clearNotice = useFavoriteStore((s) => s.clearNotice);

  if (!notice) return null;

  return (
    <BodyPortal>
      <div
        className="fixed inset-0 z-[80] flex items-end justify-center bg-black/30 p-3 sm:items-center"
        role="dialog"
        aria-modal="true"
        aria-labelledby="favorite-notice-title"
      >
        <button
          type="button"
          className="absolute inset-0 cursor-default"
          aria-label="닫기"
          onClick={clearNotice}
        />
        <div className="relative w-full max-w-md animate-fade-up rounded-t-[20px] border border-[var(--border)] bg-white p-5 shadow-[var(--shadow-md)] sm:rounded-[var(--radius-lg)]">
          <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-[var(--border-strong)] sm:hidden" />
          <h2
            id="favorite-notice-title"
            className="text-[17px] font-bold tracking-tight text-[var(--text)]"
            style={{ fontFamily: "var(--font-display), sans-serif" }}
          >
            {notice.title}
          </h2>
          {notice.description ? (
            <p className="mt-1 text-[13px] text-[var(--text-secondary)]">
              {notice.description}
            </p>
          ) : null}
          <button
            type="button"
            onClick={clearNotice}
            className="mt-5 flex w-full items-center justify-center rounded-[var(--radius-pill)] bg-[var(--text)] px-4 py-3 text-[14px] font-semibold text-white"
          >
            확인
          </button>
        </div>
      </div>
    </BodyPortal>
  );
}
