"use client";

import { useMemo } from "react";
import {
  availableCountForSlowFilter,
  filterStationsBySlowInclude,
} from "@/lib/chargerTypes";
import { useMapStore } from "@/stores/mapStore";
import { filterStationsByCarPort } from "@/lib/chargerTypes";
import { useCarStore, effectiveChargingPort } from "@/stores/carStore";

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
  /** Mobile sheet: one-line header to leave room for rows. */
  compactHeader?: boolean;
};

export function StationList({ compactHeader = false }: StationListProps) {
  const stations = useMapStore((s) => s.stations);
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

  const visible = useMemo(
    () =>
      filterStationsByCarPort(
        filterStationsBySlowInclude(stations, includeSlow),
        port,
        filterByCarPort,
      ),
    [stations, includeSlow, port, filterByCarPort],
  );

  const carPortFilterOn = filterByCarPort && port != null;
  const meta = [
    `반경 ${radiusKm}km · 직선거리`,
    !includeSlow ? "완속 제외" : null,
    carPortFilterOn ? `내 차(${port})` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <section className="ev-scroll-panel flex h-full min-h-0 w-full flex-col bg-[var(--surface)]">
      {compactHeader ? (
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
        {loading && (
          <div className="space-y-2 p-2">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="h-[72px] animate-soft-pulse rounded-[var(--radius-md)] bg-[var(--surface-muted)]"
              />
            ))}
          </div>
        )}

        {!loading && error && (
          <div className="m-2 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--warning-soft)] px-3 py-3 text-[13px] text-[var(--warning)]">
            {error}
          </div>
        )}

        {!loading && !error && visible.length === 0 && (
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
              ) : stations.length > 0 && !includeSlow ? (
                "완속만 있는 충전소입니다. 완속 필터를 켜 보세요."
              ) : (
                "DB 연결 후 현위치 기준으로 불러옵니다"
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
            const count = availableCountForSlowFilter(s, includeSlow);
            const avail = formatAvailable(count);
            const active = s.stationId === selectedId;
            return (
              <li key={s.stationId}>
                <button
                  type="button"
                  onClick={() => selectStation(s.stationId)}
                  className={[
                    "flex w-full items-start gap-3 rounded-[var(--radius-md)] px-3 py-2.5 text-left transition-colors",
                    active
                      ? "bg-[var(--accent-soft)]"
                      : "hover:bg-[var(--surface-muted)]",
                  ].join(" ")}
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
                    <span className="mt-1 flex items-center gap-2 text-[11px] text-[var(--text-secondary)]">
                      <span className={avail.tone.split(" ")[0]}>{avail.label}</span>
                      {s.distanceKm != null && (
                        <>
                          <span className="text-[var(--border-strong)]">·</span>
                          <span>{s.distanceKm.toFixed(1)} km</span>
                        </>
                      )}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
