"use client";

import { useState } from "react";

type FavoritesTab = "list" | "add";

const fieldClass =
  "mt-1.5 w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-white px-3 py-2.5 text-[16px] text-[var(--text)] outline-none focus:border-[var(--accent)] sm:text-[14px]";

/**
 * 즐겨찾기 패널 껍데기.
 * - 목록: StationList와 같은 리스트 레이아웃 (API 연동 전 빈 상태)
 * - 추가: DB(user_favorite_chargers) 기준 입력 + 전용 검색창 (기능 미연결)
 */
export function FavoritesPanel() {
  const [tab, setTab] = useState<FavoritesTab>("list");

  return (
    <section className="ev-scroll-panel flex h-full min-h-0 w-full flex-col bg-[var(--surface)]">
      <div className="shrink-0 border-b border-[var(--border)] px-3 pt-3">
        <h2
          className="text-[14px] font-bold tracking-tight text-[var(--text)] sm:text-[18px]"
          style={{ fontFamily: "var(--font-display), sans-serif" }}
        >
          즐겨찾기
        </h2>
        <p className="mt-0.5 text-[11px] text-[var(--text-secondary)] sm:text-[12px]">
          저장한 충전소 · 최대 10곳
        </p>

        <div
          className="mt-2.5 flex gap-1"
          role="tablist"
          aria-label="즐겨찾기 탭"
        >
          {(
            [
              { id: "list" as const, label: "목록" },
              { id: "add" as const, label: "추가" },
            ] as const
          ).map((item) => {
            const active = tab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setTab(item.id)}
                className={[
                  "flex-1 rounded-[10px] px-2 py-1.5 text-[12px] font-medium touch-manipulation transition-colors",
                  active
                    ? "bg-[var(--accent-soft)] text-[var(--accent)]"
                    : "text-[var(--text-muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--text)]",
                ].join(" ")}
              >
                {item.label}
              </button>
            );
          })}
        </div>
        <div className="h-2" />
      </div>

      {tab === "list" ? <FavoritesListShell /> : <FavoritesAddShell />}
    </section>
  );
}

function FavoritesListShell() {
  return (
    <div className="ev-scroll-panel min-h-0 flex-1 overflow-y-auto px-2 py-1.5">
      <div className="m-2 rounded-[var(--radius-md)] border border-dashed border-[var(--border-strong)] px-4 py-8 text-center">
        <p className="text-[14px] font-medium text-[var(--text)]">
          저장된 즐겨찾기가 없습니다
        </p>
        <p className="mt-1 text-[12px] text-[var(--text-muted)]">
          「추가」탭에서 검색·등록하거나, 목록·상세의 ★으로 저장할 수 있습니다.
        </p>
      </div>

      {/* StationList 행 레이아웃 미리보기 (더미 · 클릭/API 없음) */}
      <ul className="pointer-events-none space-y-0.5 opacity-50" aria-hidden>
        {[0, 1].map((i) => (
          <li key={i}>
            <div className="flex w-full items-start gap-1 rounded-[var(--radius-md)]">
              <div className="flex min-w-0 flex-1 items-start gap-3 px-3 py-2.5">
                <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--surface-muted)] text-[12px] font-bold text-[var(--text-muted)]">
                  —
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-semibold text-[var(--text)]">
                    충전소 이름
                  </span>
                  <span className="mt-0.5 block truncate text-[11px] text-[var(--text-muted)]">
                    주소 · 메모
                  </span>
                </span>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function FavoritesAddShell() {
  return (
    <div className="ev-scroll-panel min-h-0 flex-1 overflow-y-auto px-3 py-3">
      <form
        className="flex flex-col gap-3"
        onSubmit={(e) => {
          e.preventDefault();
        }}
      >
        <label className="block text-[12px] font-medium text-[var(--text-secondary)]">
          충전소 검색
          <span className="mt-0.5 block font-normal text-[11px] text-[var(--text-muted)]">
            즐겨찾기 전용 검색 (기능 연결 전)
          </span>
          <div className="relative mt-1.5">
            <input
              type="search"
              name="favoriteSearch"
              enterKeyHint="search"
              autoComplete="off"
              placeholder="충전소명·주소 검색"
              className={`${fieldClass} mt-0 pr-10`}
            />
            <span
              className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
              aria-hidden
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <circle
                  cx="11"
                  cy="11"
                  r="6.5"
                  stroke="currentColor"
                  strokeWidth="1.8"
                />
                <path
                  d="m16 16 4 4"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
              </svg>
            </span>
          </div>
        </label>

        <div className="rounded-[var(--radius-md)] border border-dashed border-[var(--border)] bg-[var(--surface-muted)] px-3 py-4 text-center text-[12px] text-[var(--text-muted)]">
          검색 결과가 여기에 표시됩니다
        </div>

        <label className="block text-[12px] font-medium text-[var(--text-secondary)]">
          충전소 ID
          <span className="mt-0.5 block font-normal text-[11px] text-[var(--text-muted)]">
            DB · user_favorite_chargers.stat_id
          </span>
          <input
            type="text"
            name="stationId"
            readOnly
            placeholder="검색에서 선택 시 채워짐"
            className={`${fieldClass} cursor-default bg-[var(--surface-muted)]`}
          />
        </label>

        <label className="block text-[12px] font-medium text-[var(--text-secondary)]">
          메모
          <span className="mt-0.5 block font-normal text-[11px] text-[var(--text-muted)]">
            DB · memo (최대 100자, 선택)
          </span>
          <input
            type="text"
            name="memo"
            maxLength={100}
            placeholder="예: 회사 근처, 야간 충전"
            className={fieldClass}
          />
        </label>

        <button
          type="submit"
          className="mt-1 w-full rounded-[var(--radius-pill)] bg-[var(--text)] px-4 py-3 text-[14px] font-semibold text-white shadow-[var(--shadow-sm)] opacity-60"
        >
          즐겨찾기 추가
        </button>
        <p className="text-center text-[11px] text-[var(--text-muted)]">
          UI 껍데기 — 저장·검색 API는 이후 연결
        </p>
      </form>
    </div>
  );
}
