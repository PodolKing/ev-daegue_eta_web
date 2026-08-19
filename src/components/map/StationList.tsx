"use client";

import { useMemo } from "react";
import {
  availableCountForSlowFilter,
  filterStationsByCarPort,
  filterStationsBySlowInclude,
  STATUS_STALE_LABEL,
  stationStatusStaleLevel,
} from "@/lib/chargerTypes";
import {
  parkingFreeShort,
  parkingKind,
  parkingListTextClass,
} from "@/lib/parking";
import { FavoriteStarButton } from "@/components/map/FavoriteStarButton";
import { ensureStationLoaded } from "@/stores/ensureStationLoaded";
import { useMapStore } from "@/stores/mapStore";
import { useCarStore, effectiveChargingPort } from "@/stores/carStore";
import type { Station } from "@/types/station";

function formatAvailable(count: number | null): { label: string; tone: string } {
  if (count === null) {
    return { label: "미관측", tone: "text-[var(--text-muted)] bg-[var(--surface-muted)]" };
  }
  if (count === 0) {
    return { label: "충전가능 0", tone: "text-[var(--warning)] bg-[var(--warning-soft)]" };
  }
  return {
    label: `충전가능 ${count}`,
    tone: "text-[var(--success)] bg-[var(--success-soft)]",
  };
}

type StationListProps = {
  compactHeader?: boolean;
  items?: Station[];
  hideRadiusMeta?: boolean;
};

export function StationList({
  compactHeader = false,
  items,
  hideRadiusMeta = false,
}: StationListProps) {
  const mapStations = useMapStore((s) => s.stations);
  const includeSlow = useMapStore((s) => s.includeSlow);
  const selectedId = useMapStore((s) => s.selectedId);
  const loading = useMapStore((s) => s.loading);
  const error = useMapStore((s) => s.error);
  const selectStation = useMapStore((s) => s.selectStation);
  const radiusKm = useMapStore((s) => s.radiusKm);
  const filterByCarPort = useCarStore((s) => s.filterByCarPort);
  const setFilterByCarPort = useCarStore((s) => s.setFilterByCarPort);
  const primaryCar = useCarStore((s) => s.primaryCar);
  const port = effectiveChargingPort(primaryCar);

  const usingItems = items != null;
  const source = usingItems ? items : mapStations;

  const visible = useMemo(
    () =>
      usingItems
        ? source
        : filterStationsByCarPort(
            filterStationsBySlowInclude(source, includeSlow),
            port,
            filterByCarPort,
          ),
    [usingItems, source, includeSlow, port, filterByCarPort],
  );

  const carPortFilterOn = !usingItems && filterByCarPort && port != null;
  const meta = [
    `반경 ${radiusKm}km · 직선거리`,
    !includeSlow ? "완속 제외" : null,
    carPortFilterOn ? `내 차(${port})` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const onRowClick = (s: Station) => {
    if (!usingItems) {
      selectStation(s.stationId);
      return;
    }
    void (async () => {
      if (s.lat && s.lng) {
        await ensureStationLoaded(s.stationId, s.lat, s.lng);
      }
      useMapStore.getState().selectStation(s.stationId);
    })();
  };

  return (
    <section className="ev-scroll-panel flex h-full min-h-0 w-full flex-col bg-[var(--surface)]">
      {hideRadiusMeta ? null : compactHeader ? (
        <div className="flex shrink-0 items-baseline justify-between gap-2 border-b border-[var(--border)] px-3 py-2">
          <h2
            className="truncate text-[14px] font-bold tracking-tight text-[var(--text)]"
            style={{ fontFamily: "var(--font-display), sans-serif" }}
          >
            주변 충전소
          </h2>
          <p className="shrink-0 text-[11px] text-[var(--text-muted)]">{meta}</p>
        </div>
      ) : (
        <div className="shrink-0 border-b border-[var(--border)] px-4 py-3">
          <h2
            className="text-[18px] font-bold tracking-tight text-[var(--text)]"
            style={{ fontFamily: "var(--font-display), sans-serif" }}
          >
            주변 충전소
          </h2>
          <p className="mt-0.5 text-[12px] text-[var(--text-secondary)]">{meta}</p>
        </div>
      )}

      <div className="ev-scroll-panel min-h-0 flex-1 overflow-y-auto px-2 py-1.5">
        {!usingItems && loading && (
          <div className="space-y-2 p-2">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="h-[72px] animate-soft-pulse rounded-[var(--radius-md)] bg-[var(--surface-muted)]"
              />
            ))}
          </div>
        )}

        {!usingItems && !loading && error && (
          <div className="m-2 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--warning-soft)] px-3 py-3 text-[13px] text-[var(--warning)]">
            {error}
          </div>
        )}

        {!usingItems && !loading && !error && visible.length === 0 && (
          <div className="m-2 rounded-[var(--radius-md)] border border-dashed border-[var(--border-strong)] px-4 py-8 text-center">
            <p className="text-[14px] font-medium text-[var(--text)]">
              표시할 충전소가 없습니다
            </p>
            <p className="mt-1 text-[12px] text-[var(--text-muted)]">
              {carPortFilterOn ? (
                <>
                  이 반경에 내 차 포트
                  {port === "NACS" ? "(NACS)" : port === "CCS1" ? "(CCS)" : "(CHAdeMO)"}
                  로 맞는 곳이 없습니다.
                  {port === "NACS"
                    ? " 이 지역 공공 NACS·콤보+NACS는 아직 매우 적습니다."
                    : ""}{" "}
                  반경을 넓히거나 전체 보기로 전환해 보세요.
                </>
              ) : mapStations.length > 0 && !includeSlow ? (
                "완속만 있는 충전소입니다. 완속 필터를 켜 보세요."
              ) : (
                "현재 대구지역 충전소만 불러옵니다"
              )}
            </p>
            {carPortFilterOn ? (
              <button
                type="button"
                onClick={() => setFilterByCarPort(false)}
                className="mt-3 rounded-[10px] border border-[var(--border)] bg-white px-3 py-1.5 text-[12px] font-medium text-[var(--text)] touch-manipulation hover:bg-[var(--surface-muted)]"
              >
                전체 보기
              </button>
            ) : null}
          </div>
        )}

        <ul className="space-y-0.5">
          {visible.map((s) => {
            const count = usingItems
              ? s.availableCount
              : availableCountForSlowFilter(s, includeSlow);
            const avail = formatAvailable(count);
            const parkingLabel = parkingFreeShort(s.parkingFree);
            const parkingTone = parkingKind(s.parkingFree);
            const active = s.stationId === selectedId;
            return (
              <li key={s.stationId}>
                <div
                  className={[
                    "flex w-full items-start gap-1 rounded-[var(--radius-md)] transition-colors",
                    active
                      ? "bg-[var(--accent-soft)]"
                      : "hover:bg-[var(--surface-muted)]",
                  ].join(" ")}
                >
                  <button
                    type="button"
                    onClick={() => onRowClick(s)}
                    className="flex min-w-0 flex-1 items-start gap-3 px-3 py-2.5 text-left touch-manipulation"
                  >
                    <span
                      className={[
                        "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[12px] font-bold",
                        avail.tone,
                      ].join(" ")}
                    >
                      {count === null ? "—" : count}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-semibold text-[var(--text)]">
                        {s.name ?? s.stationId}
                      </span>
                      <span className="mt-0.5 block truncate text-[11px] text-[var(--text-muted)]">
                        {s.address ?? "주소 없음"}
                      </span>
                      <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-[var(--text-secondary)]">
                        <span className={avail.tone.split(" ")[0]}>{avail.label}</span>
                        {s.distanceKm != null && (
                          <>
                            <span className="text-[var(--border-strong)]">·</span>
                            <span>{s.distanceKm.toFixed(1)} km</span>
                          </>
                        )}
                        {parkingLabel && parkingTone ? (
                          <>
                            <span className="text-[var(--border-strong)]">·</span>
                            <span
                              className={`font-medium ${parkingListTextClass(parkingTone)}`}
                            >
                              {parkingLabel}
                            </span>
                          </>
                        ) : null}
                        {stationStatusStaleLevel(s) === "all" ? (
                          <>
                            <span className="text-[var(--border-strong)]">·</span>
                            <span className="font-medium text-[var(--warning)]">
                              {STATUS_STALE_LABEL}
                            </span>
                          </>
                        ) : null}
                      </span>
                    </span>
                  </button>
                  <FavoriteStarButton
                    stationId={s.stationId}
                    variant="list"
                    className="mr-1.5"
                  />
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}