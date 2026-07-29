"use client";

import {
  detailAvailabilityLines,
  getChargerTypeLabel,
  isSlowChargerType,
} from "@/lib/chargerTypes";
import { useMapStore } from "@/stores/mapStore";

export function StationDetailCard() {
  const stations = useMapStore((s) => s.stations);
  const selectedId = useMapStore((s) => s.selectedId);
  const setSelectedId = useMapStore((s) => s.setSelectedId);

  const station = stations.find((s) => s.stationId === selectedId);
  if (!station) return null;

  const chargerTypes = station.chargerTypes ?? [];
  const avail = detailAvailabilityLines(station);

  return (
    <article className="animate-fade-up w-full max-w-[360px] rounded-[var(--radius-lg)] border border-[var(--border)] bg-white/95 p-4 shadow-[var(--shadow-md)] backdrop-blur-md">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-medium uppercase tracking-[0.06em] text-[var(--text-muted)]">
            Station
          </p>
          <h3
            className="mt-1 truncate text-[17px] font-bold tracking-tight text-[var(--text)]"
            style={{ fontFamily: "var(--font-display), sans-serif" }}
          >
            {station.name ?? station.stationId}
          </h3>
          <p className="mt-1 line-clamp-2 text-[12px] leading-relaxed text-[var(--text-secondary)]">
            {station.address ?? "주소 정보 없음"}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setSelectedId(null)}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--surface-muted)] text-[var(--text-muted)] hover:text-[var(--text)]"
          aria-label="닫기"
        >
          ×
        </button>
      </div>

      <div className="mt-3">
        <p className="text-[11px] font-medium text-[var(--text-muted)]">충전기 타입</p>
        {chargerTypes.length > 0 ? (
          <ul className="mt-1.5 flex flex-wrap gap-1.5" aria-label="충전기 타입">
            {chargerTypes.map((code) => {
              const slow = isSlowChargerType(code);
              return (
                <li key={code}>
                  <span
                    className={[
                      "inline-flex items-center gap-1 rounded-[var(--radius-pill)] px-2.5 py-1 text-[11px] font-semibold tracking-tight",
                      slow
                        ? "bg-[var(--success-soft)] text-[var(--success)]"
                        : "bg-[var(--accent-soft)] text-[var(--accent)]",
                    ].join(" ")}
                  >
                    <span
                      className={[
                        "h-1.5 w-1.5 shrink-0 rounded-full",
                        slow ? "bg-[var(--success)]" : "bg-[var(--accent)]",
                      ].join(" ")}
                      aria-hidden
                    />
                    {getChargerTypeLabel(code)}
                  </span>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="mt-1.5 text-[12px] text-[var(--text-muted)]">타입 정보 없음</p>
        )}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <div className="rounded-[var(--radius-md)] bg-[var(--surface-muted)] px-3 py-3">
          {avail.mixed ? (
            <ul className="space-y-2" aria-label="타입별 충전가능">
              {avail.lines.map((line) => (
                <li key={line.label} className="flex items-baseline justify-between gap-2">
                  <span className="text-[11px] text-[var(--text-muted)]">{line.label}</span>
                  <span
                    className={`text-[20px] font-extrabold leading-none tracking-tight ${line.tone}`}
                    style={{ fontFamily: "var(--font-display), sans-serif" }}
                  >
                    {line.value}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <>
              <p
                className={`text-[28px] font-extrabold leading-none tracking-tight ${avail.lines[0].tone}`}
                style={{ fontFamily: "var(--font-display), sans-serif" }}
              >
                {avail.lines[0].value}
              </p>
              <p className="mt-1 text-[11px] text-[var(--text-muted)]">{avail.lines[0].label}</p>
            </>
          )}
        </div>
        <div className="rounded-[var(--radius-md)] bg-[var(--surface-muted)] px-3 py-3">
          <p
            className="text-[28px] font-extrabold leading-none tracking-tight text-[var(--text)]"
            style={{ fontFamily: "var(--font-display), sans-serif" }}
          >
            {station.distanceKm != null ? station.distanceKm.toFixed(1) : "—"}
          </p>
          <p className="mt-1 text-[11px] text-[var(--text-muted)]">직선 km</p>
        </div>
      </div>

      <button
        type="button"
        className="mt-4 flex w-full items-center justify-center gap-1 rounded-[var(--radius-pill)] bg-[var(--accent)] px-4 py-2.5 text-[13px] font-semibold text-white transition hover:opacity-90"
      >
        길찾기
        <span aria-hidden>›</span>
      </button>
    </article>
  );
}
