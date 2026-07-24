"use client";

import { useMapStore } from "@/stores/mapStore";

export function StationDetailCard() {
  const stations = useMapStore((s) => s.stations);
  const selectedId = useMapStore((s) => s.selectedId);
  const setSelectedId = useMapStore((s) => s.setSelectedId);

  const station = stations.find((s) => s.stationId === selectedId);
  if (!station) return null;

  const avail =
    station.availableCount === null
      ? { title: "데이터 없음", sub: "상태 미관측", tone: "text-[var(--text-muted)]" }
      : station.availableCount === 0
        ? { title: "0", sub: "충전대기 없음", tone: "text-[var(--warning)]" }
        : {
            title: String(station.availableCount),
            sub: "충전대기",
            tone: "text-[var(--success)]",
          };

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

      <div className="mt-4 grid grid-cols-2 gap-2">
        <div className="rounded-[var(--radius-md)] bg-[var(--surface-muted)] px-3 py-3">
          <p className={`text-[28px] font-extrabold leading-none tracking-tight ${avail.tone}`}
            style={{ fontFamily: "var(--font-display), sans-serif" }}
          >
            {avail.title}
          </p>
          <p className="mt-1 text-[11px] text-[var(--text-muted)]">{avail.sub}</p>
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
