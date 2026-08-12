"use client";

import { queryNearbyStationsAt } from "@/lib/map/queryNearbyStations";
import { useMapStore } from "@/stores/mapStore";
import { useRecommendStore } from "@/stores/recommendStore";
import { useRouteStore } from "@/stores/routeStore";

const chipClassName = `
  rounded-[var(--radius-pill)]
  border border-[var(--border)]
  bg-white/90
  px-3.5 py-2
  text-[13px] font-semibold tracking-tight
  text-[var(--text-secondary)]
  shadow-[var(--shadow-sm)]
  backdrop-blur-md
  touch-manipulation
  transition-[background-color,border-color,color,opacity] duration-200
  hover:bg-white
  hover:text-[var(--text)]
  active:bg-[var(--surface-muted)]
`;

/**
 * 검색 도착 핀(preview)일 때 지도 상단 칩.
 * PlaceSummaryBar「주변」과 동일: stationsAnchor source=destination.
 * 「주변 탐색하기」(map)와는 별 기능·별 라벨.
 */
export function DestinationNearbyChip() {
  const destination = useRouteStore((s) => s.destination);
  const status = useRouteStore((s) => s.status);
  const selectedId = useMapStore((s) => s.selectedId);
  const recommendActive = useRecommendStore((s) => s.active);

  if (!destination || selectedId || recommendActive) return null;
  if (status !== "preview") return null;

  return (
    <div className="pointer-events-auto flex justify-center animate-fade-up">
      <button
        type="button"
        onClick={() =>
          queryNearbyStationsAt(destination.lat, destination.lng)
        }
        aria-label="도착지 주변 충전소 조회"
        className={chipClassName}
      >
        이 주변 충전소
      </button>
    </div>
  );
}
