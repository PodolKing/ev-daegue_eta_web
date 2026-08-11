"use client";

import { useState } from "react";
import { useRecommendStore } from "@/stores/recommendStore";
import { useRouteStore } from "@/stores/routeStore";
import { useMapStore } from "@/stores/mapStore";
import { ensureStationLoaded } from "@/stores/ensureStationLoaded";
import type { RecommendItem } from "@/types/recommend";

/**
 * AI 추천 목록 — 길찾기 전에 점수순으로 고른다.
 * 행 탭: DetailCard 기본정보. Detail이 뜨면 목록은 한 줄로 접힘(모바일 공간).
 */
export function RecommendStationPanel() {
  const active = useRecommendStore((s) => s.active);
  const loading = useRecommendStore((s) => s.loading);
  const error = useRecommendStore((s) => s.error);
  const items = useRecommendStore((s) => s.items);
  const selectedStatId = useRecommendStore((s) => s.selectedStatId);
  const setSelectedStatId = useRecommendStore((s) => s.setSelectedStatId);
  const clear = useRecommendStore((s) => s.clear);
  const startDirections = useRouteStore((s) => s.startDirections);
  const selectedId = useMapStore((s) => s.selectedId);
  const setSelectedId = useMapStore((s) => s.setSelectedId);
  const focusStationOnMap = useMapStore((s) => s.focusStationOnMap);
  const [going, setGoing] = useState(false);
  /** Detail 미리보기 중 사용자가 「목록」으로 다시 펼침 */
  const [listExpanded, setListExpanded] = useState(false);

  if (!active) return null;

  const selected = items.find((i) => i.statId === selectedStatId) ?? null;
  const detailOpen =
    selectedStatId != null && selectedId === selectedStatId;
  const collapsed = detailOpen && !listExpanded && !loading;

  /** 목록/마커 선택 — hydrate + DetailCard. selectStation 금지(destination 유지). */
  const preview = async (item: RecommendItem) => {
    setListExpanded(false);
    setSelectedStatId(item.statId);
    const station = await ensureStationLoaded(item.statId, item.lat, item.lng);
    focusStationOnMap(item.statId, {
      lat: station?.lat ?? item.lat,
      lng: station?.lng ?? item.lng,
    });
  };

  const openList = () => {
    setListExpanded(true);
    // Detail 접어 공간 확보 — 선택(selectedStatId)·CTA는 유지
    setSelectedId(null);
  };

  const go = async () => {
    if (!selected || going) return;
    setGoing(true);
    try {
      const station = await ensureStationLoaded(
        selected.statId,
        selected.lat,
        selected.lng,
      );
      startDirections({
        name: station?.name ?? selected.statNm ?? selected.statId,
        address: station?.address ?? selected.addr ?? "",
        lat: station?.lat ?? selected.lat,
        lng: station?.lng ?? selected.lng,
        stationId: selected.statId,
      });
    } finally {
      setGoing(false);
    }
  };

  if (collapsed && selected) {
    const rank =
      selected.rank ??
      items.findIndex((i) => i.statId === selected.statId) + 1;
    return (
      <div className="pointer-events-auto w-full max-w-[min(100%,380px)] animate-fade-up rounded-[var(--radius-lg)] border border-[var(--border)] bg-white/95 shadow-[var(--shadow-md)] backdrop-blur-md">
        <div className="flex items-center gap-2 px-3 py-2">
          <span
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--accent)] text-[11px] font-bold text-white"
            aria-hidden
          >
            {rank > 0 ? rank : "·"}
          </span>
          <p
            className="min-w-0 flex-1 truncate text-[13px] font-semibold text-[var(--text)]"
            style={{ fontFamily: "var(--font-display), sans-serif" }}
          >
            {selected.statNm ?? selected.statId}
          </p>
          <button
            type="button"
            onClick={openList}
            className="shrink-0 rounded-[var(--radius-pill)] border border-[var(--border)] bg-[var(--surface-muted)] px-2.5 py-1 text-[11px] font-semibold text-[var(--text-secondary)] touch-manipulation"
          >
            목록
          </button>
          <button
            type="button"
            onClick={() => clear()}
            className="shrink-0 rounded-[var(--radius-pill)] border border-[var(--border)] bg-white px-2 py-1 text-[11px] font-semibold text-[var(--text-secondary)] touch-manipulation"
          >
            닫기
          </button>
        </div>
        <div className="border-t border-[var(--border)] p-2">
          <button
            type="button"
            disabled={going}
            onClick={() => void go()}
            className="w-full rounded-[var(--radius-pill)] bg-[var(--accent)] px-3 py-2.5 text-[13px] font-semibold text-white touch-manipulation enabled:hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {going ? "불러오는 중…" : "이 충전소로 길찾기"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="pointer-events-auto w-full max-w-[min(100%,380px)] animate-fade-up rounded-[var(--radius-lg)] border border-[var(--border)] bg-white/95 shadow-[var(--shadow-md)] backdrop-blur-md">
      <div className="flex items-center gap-2 border-b border-[var(--border)] px-3 py-2">
        <p
          className="min-w-0 flex-1 truncate text-[13px] font-bold text-[var(--text)]"
          style={{ fontFamily: "var(--font-display), sans-serif" }}
        >
          AI 추천 충전소
        </p>
        <button
          type="button"
          onClick={() => clear()}
          className="shrink-0 rounded-[var(--radius-pill)] border border-[var(--border)] bg-[var(--surface-muted)] px-2 py-1 text-[11px] font-semibold text-[var(--text-secondary)] touch-manipulation"
        >
          닫기
        </button>
      </div>

      {loading ? (
        <p className="px-3 py-4 text-center text-[12px] text-[var(--text-muted)]">
          추천 불러오는 중…
        </p>
      ) : null}

      {!loading && error ? (
        <p className="px-3 py-3 text-[12px] text-[var(--danger)]">{error}</p>
      ) : null}

      {!loading && items.length > 0 ? (
        <ul className="ev-scroll-panel max-h-[min(40dvh,280px)] overflow-y-auto overscroll-contain px-1 py-1">
          {items.map((item, index) => {
            const rank = item.rank ?? index + 1;
            const on = item.statId === selectedStatId;
            const score =
              item.recommendationScore != null
                ? Math.round(item.recommendationScore)
                : null;
            return (
              <li key={item.statId}>
                <button
                  type="button"
                  onClick={() => void preview(item)}
                  className={[
                    "flex w-full items-start gap-2 rounded-[var(--radius-md)] px-2 py-2 text-left touch-manipulation",
                    on
                      ? "bg-[var(--accent-soft)]"
                      : "hover:bg-[var(--surface-muted)]",
                  ].join(" ")}
                >
                  <span
                    className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--accent)] text-[11px] font-bold text-white"
                    aria-hidden
                  >
                    {rank}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-semibold text-[var(--text)]">
                      {item.statNm ?? item.statId}
                    </span>
                    <span className="mt-0.5 block truncate text-[11px] text-[var(--text-muted)]">
                      {item.recommendationLabel ?? "—"}
                      {score != null ? ` · ${score}점` : ""}
                      {item.distanceM != null
                        ? ` · ${(item.distanceM / 1000).toFixed(1)}km`
                        : ""}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}

      <div className="border-t border-[var(--border)] p-2">
        <button
          type="button"
          disabled={!selected || going}
          onClick={() => void go()}
          className="w-full rounded-[var(--radius-pill)] bg-[var(--accent)] px-3 py-2.5 text-[13px] font-semibold text-white touch-manipulation enabled:hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {going
            ? "불러오는 중…"
            : selected
              ? "이 충전소로 길찾기"
              : "충전소를 선택하세요"}
        </button>
      </div>
    </div>
  );
}
