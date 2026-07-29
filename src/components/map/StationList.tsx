"use client";

import { useMemo } from "react";
import { filterStationsBySlowInclude } from "@/lib/chargerTypes";
import { useMapStore } from "@/stores/mapStore";

function formatAvailable(count: number | null): { label: string; tone: string } {
  if (count === null) {
    return { label: "미관측", tone: "text-[var(--text-muted)] bg-[var(--surface-muted)]" };
  }
  if (count === 0) {
    return { label: "대기 0", tone: "text-[var(--warning)] bg-[var(--warning-soft)]" };
  }
  return {
    label: `대기 ${count}`,
    tone: "text-[var(--success)] bg-[var(--success-soft)]",
  };
}

export function StationList() {
  const stations = useMapStore((s) => s.stations);
  const includeSlow = useMapStore((s) => s.includeSlow);
  const selectedId = useMapStore((s) => s.selectedId);
  const loading = useMapStore((s) => s.loading);
  const error = useMapStore((s) => s.error);
  const selectStation = useMapStore((s) => s.selectStation);
  const radiusKm = useMapStore((s) => s.radiusKm);

  const visible = useMemo(
    () => filterStationsBySlowInclude(stations, includeSlow),
    [stations, includeSlow],
  );

  return (
    <section className="flex h-full min-h-0 w-full flex-col bg-[var(--surface)]">
      <div className="border-b border-[var(--border)] px-4 py-4">
        <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-[var(--text-muted)]">
          Nearby
        </p>
        <h2
          className="mt-1 text-[20px] font-bold tracking-tight text-[var(--text)]"
          style={{ fontFamily: "var(--font-display), sans-serif" }}
        >
          주변 충전소
        </h2>
        <p className="mt-1 text-[12px] text-[var(--text-secondary)]">
          반경 {radiusKm}km · 직선 거리 기준
          {!includeSlow ? " · 완속 제외" : ""}
        </p>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-2 py-2">
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
            <p className="text-[14px] font-medium text-[var(--text)]">표시할 충전소가 없습니다</p>
            <p className="mt-1 text-[12px] text-[var(--text-muted)]">
              {stations.length > 0 && !includeSlow
                ? "완속만 있는 충전소입니다. 완속 필터를 켜 보세요."
                : "DB 연결 후 현위치 기준으로 불러옵니다"}
            </p>
          </div>
        )}

        <ul className="space-y-1">
          {visible.map((s) => {
            const avail = formatAvailable(s.availableCount);
            const active = s.stationId === selectedId;
            return (
              <li key={s.stationId}>
                <button
                  type="button"
                  onClick={() => selectStation(s.stationId)}
                  className={[
                    "flex w-full items-start gap-3 rounded-[var(--radius-md)] px-3 py-3 text-left transition-colors",
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
                    {s.availableCount === null ? "—" : s.availableCount}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-semibold text-[var(--text)]">
                      {s.name ?? s.stationId}
                    </span>
                    <span className="mt-0.5 block truncate text-[11px] text-[var(--text-muted)]">
                      {s.address ?? "주소 없음"}
                    </span>
                    <span className="mt-1.5 flex items-center gap-2 text-[11px] text-[var(--text-secondary)]">
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
