"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { GuestAuthBanner } from "@/components/auth/GuestAuthBanner";
import { StationList } from "@/components/map/StationList";
import { searchStations, type FavoriteItem } from "@/lib/api";
import { useAuthStore } from "@/stores/authStore";
import { useFavoriteStore } from "@/stores/favoriteStore";
import type { Station } from "@/types/station";

const fieldClass =
  "mt-1.5 w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-white px-3 py-2.5 text-[16px] text-[var(--text)] outline-none focus:border-[var(--accent)] sm:text-[14px]";

function favoriteItemToStation(item: FavoriteItem): Station {
  const line = [item.address, item.memo].filter(Boolean).join(" · ");
  return {
    stationId: item.stationId,
    name: item.name,
    address: line || null,
    lat: item.lat ?? 0,
    lng: item.lng ?? 0,
    availableCount: item.availableCount ?? null,
    distanceKm: null,
  };
}

/**
 * 즐겨찾기 패널.
 * - 비로그인: 상단 안내 + 메뉴 열람. 등록은 로그인 후.
 * - 목록은 store hydrate. 추가는 충전소 검색 후 toggle.
 */
export function FavoritesPanel() {
  const tab = useFavoriteStore((s) => s.addTab);
  const setTab = useFavoriteStore((s) => s.setAddTab);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

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
        <GuestAuthBanner
          className="mt-2"
          message="로그인해야 등록할 수 있습니다"
        />

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

      {tab === "list" ? (
        <FavoritesListShell />
      ) : (
        <FavoritesAddShell
          canSubmit={isAuthenticated}
          onAdded={() => setTab("list")}
        />
      )}
    </section>
  );
}

function FavoritesListShell() {
  const items = useFavoriteStore((s) => s.items);
  const status = useFavoriteStore((s) => s.status);
  const stations = useMemo(
    () => items.map(favoriteItemToStation),
    [items],
  );

  if (status === "loading" && items.length === 0) {
    return (
      <div className="ev-scroll-panel min-h-0 flex-1 overflow-y-auto px-2 py-1.5">
        <div className="space-y-2 p-2">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-[72px] animate-soft-pulse rounded-[var(--radius-md)] bg-[var(--surface-muted)]"
            />
          ))}
        </div>
      </div>
    );
  }

  if (stations.length === 0) {
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
      </div>
    );
  }

  return (
    <div className="min-h-0 flex-1">
      <StationList items={stations} hideRadiusMeta />
    </div>
  );
}

function FavoritesAddShell({
  canSubmit,
  onAdded,
}: {
  canSubmit: boolean;
  onAdded: () => void;
}) {
  const query = useFavoriteStore((s) => s.addDraft.query);
  const results = useFavoriteStore((s) => s.addDraft.results);
  const selected = useFavoriteStore((s) => s.addDraft.selected);
  const memo = useFavoriteStore((s) => s.addDraft.memo);
  const setAddDraft = useFavoriteStore((s) => s.setAddDraft);
  const clearAddDraft = useFavoriteStore((s) => s.clearAddDraft);
  const isFavorite = useFavoriteStore((s) => s.isFavorite);
  const toggleFavorite = useFavoriteStore((s) => s.toggleFavorite);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const alreadySaved = selected ? isFavorite(selected.stationId) : false;
  const canResetSearch =
    query.length > 0 || results.length > 0 || selected != null;

  const runSearch = useCallback(async (q: string) => {
    const trimmed = q.trim();
    if (trimmed.length < 2) {
      setAddDraft({ results: [] });
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await searchStations(trimmed);
      setAddDraft({ results: data.items });
      if (data.items.length === 0) setError("검색 결과가 없습니다");
    } catch {
      setAddDraft({ results: [] });
      setError("검색에 실패했습니다");
    } finally {
      setLoading(false);
    }
  }, [setAddDraft]);

  useEffect(() => {
    const id = window.setTimeout(() => {
      void runSearch(query);
    }, 300);
    return () => window.clearTimeout(id);
  }, [query, runSearch]);

  return (
    <div className="ev-scroll-panel min-h-0 flex-1 overflow-y-auto px-3 py-3">
      <form
        className="flex flex-col gap-3"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!canSubmit || !selected || alreadySaved || saving) return;
          setSaving(true);
          const ok = await toggleFavorite(selected.stationId, memo);
          setSaving(false);
          if (!ok) return;
          clearAddDraft();
          onAdded();
        }}
      >
        <label className="block text-[12px] font-medium text-[var(--text-secondary)]">
          <span className="flex items-center justify-between gap-2">
            충전소 검색
            {canResetSearch ? (
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setAddDraft({
                    query: "",
                    results: [],
                    selected: null,
                  });
                }}
                className="rounded-[8px] px-2 py-0.5 text-[11px] font-medium text-[var(--text-muted)] touch-manipulation hover:bg-[var(--surface-muted)] hover:text-[var(--text)]"
              >
                초기화
              </button>
            ) : null}
          </span>
          <span className="mt-0.5 block font-normal text-[11px] text-[var(--text-muted)]">
            이름이나 주소로 찾아 추가할 수 있습니다
          </span>
          <div className="relative mt-1.5">
            <input
              type="search"
              name="favoriteSearch"
              value={query}
              onChange={(e) => setAddDraft({ query: e.target.value })}
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

        {loading ? (
          <p className="px-3 py-4 text-center text-[12px] text-[var(--text-muted)]">
            검색 중…
          </p>
        ) : error ? (
          <p className="px-3 py-4 text-center text-[12px] text-[var(--text-muted)]">
            {error}
          </p>
        ) : results.length === 0 ? (
          <div className="rounded-[var(--radius-md)] border border-dashed border-[var(--border)] bg-[var(--surface-muted)] px-3 py-4 text-center text-[12px] text-[var(--text-muted)]">
            검색 결과가 여기에 표시됩니다
          </div>
        ) : (
          <ul className="ev-scroll-panel max-h-48 overflow-y-auto rounded-[var(--radius-md)] border border-[var(--border)]">
            {results.map((item) => {
              const saved = isFavorite(item.stationId);
              const active = selected?.stationId === item.stationId;
              return (
                <li key={item.stationId}>
                  <button
                    type="button"
                    onClick={() => setAddDraft({ selected: item })}
                    className={[
                      "flex w-full flex-col items-start px-3 py-2 text-left touch-manipulation",
                      active
                        ? "bg-[var(--accent-soft)]"
                        : "hover:bg-[var(--surface-muted)]",
                    ].join(" ")}
                  >
                    <span className="text-[13px] font-medium text-[var(--text)]">
                      {item.name ?? item.stationId}
                      {saved ? " · 저장됨" : ""}
                    </span>
                    <span className="text-[11px] text-[var(--text-muted)]">
                      {item.address ?? ""}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        <label className="block text-[12px] font-medium text-[var(--text-secondary)]">
          선택한 충전소
          <input
            type="text"
            name="stationName"
            readOnly
            value={selected?.name ?? ""}
            placeholder="검색에서 선택하면 여기에 표시됩니다"
            className={`${fieldClass} cursor-default bg-[var(--surface-muted)]`}
          />
        </label>

        <label className="block text-[12px] font-medium text-[var(--text-secondary)]">
          메모
          <span className="mt-0.5 block font-normal text-[11px] text-[var(--text-muted)]">
            선택 · 최대 100자
          </span>
          <input
            type="text"
            name="memo"
            value={memo}
            onChange={(e) => setAddDraft({ memo: e.target.value })}
            maxLength={100}
            placeholder="예: 회사 근처, 야간 충전"
            className={fieldClass}
          />
        </label>

        <button
          type="submit"
          disabled={!canSubmit || !selected || alreadySaved || saving}
          className="mt-1 w-full rounded-[var(--radius-pill)] bg-[var(--text)] px-4 py-3 text-[14px] font-semibold text-white shadow-[var(--shadow-sm)] disabled:opacity-50"
        >
          {!canSubmit
            ? "로그인 후 추가"
            : alreadySaved
              ? "이미 저장됨"
              : "즐겨찾기 추가"}
        </button>
        {!canSubmit ? (
          <p className="text-center text-[11px] text-[var(--text-muted)]">
            로그인해야 즐겨찾기에 저장할 수 있습니다
          </p>
        ) : !selected ? (
          <p className="text-center text-[11px] text-[var(--text-muted)]">
            검색에서 충전소를 선택하세요
          </p>
        ) : null}
      </form>
    </div>
  );
}
