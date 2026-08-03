"use client";

import {
  detailAvailabilityLines,
  getChargerTypeLabel,
  isSlowChargerType,
} from "@/lib/chargerTypes";
import { FEATURES } from "@/lib/features";
import {
  UnimplementedBadge,
  UnimplementedHint,
} from "@/components/ui/Unimplemented";
import { useMapStore } from "@/stores/mapStore";
import { useRouteStore } from "@/stores/routeStore";

export function StationDetailCard() {
  const stations = useMapStore((s) => s.stations);
  const selectedId = useMapStore((s) => s.selectedId);
  const setSelectedId = useMapStore((s) => s.setSelectedId);
  const setMobileListOpen = useMapStore((s) => s.setMobileListOpen);
  const startDirections = useRouteStore((s) => s.startDirections);
  const clearDestination = useRouteStore((s) => s.clearDestination);
  const routeStatus = useRouteStore((s) => s.status);
  const routeError = useRouteStore((s) => s.error);
  const routeDest = useRouteStore((s) => s.destination);
  const distanceM = useRouteStore((s) => s.distanceM);
  const durationSec = useRouteStore((s) => s.durationSec);

  const station = stations.find((s) => s.stationId === selectedId);
  if (!station) return null;

  const chargerTypes = station.chargerTypes ?? [];
  const avail = detailAvailabilityLines(station);
  const forThisStation = routeDest?.stationId === station.stationId;
  const showRouteUnimplemented =
    routeError === "__UNIMPLEMENTED__" && forThisStation;
  /** 활성 경로 — 다른 충전소를 보고 있어도 취소 가능해야 함. */
  const routeActive =
    routeStatus === "loading" || routeStatus === "ready";
  /** 길찾기 진행·결과 중 — 카드가 ETA 중심으로 한 단 커짐 (모바일·웹 공통). */
  const routeMode =
    forThisStation &&
    (routeStatus === "loading" ||
      routeStatus === "ready" ||
      (routeStatus === "error" && !!routeError));

  const etaLabel =
    distanceM !== null && durationSec !== null
      ? `${(distanceM / 1000).toFixed(1)} km · 약 ${Math.round(durationSec / 60)}분`
      : null;
  const etaKm =
    distanceM !== null ? (distanceM / 1000).toFixed(1) : null;
  const etaMin =
    durationSec !== null ? String(Math.round(durationSec / 60)) : null;

  return (
    <article
      className={[
        "animate-fade-up w-full border border-[var(--border)] bg-white/95 shadow-[var(--shadow-md)] backdrop-blur-md transition-[max-width,padding,min-height] duration-200",
        routeMode
          ? "max-w-[360px] min-h-[min(100%,340px)] rounded-[var(--radius-lg)] p-5 md:max-w-[380px]"
          : "max-w-[360px] rounded-[var(--radius-lg)] p-4",
      ].join(" ")}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-medium uppercase tracking-[0.06em] text-[var(--text-muted)]">
            {routeMode ? "Directions" : "Station"}
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
          onClick={() => {
            setSelectedId(null);
            setMobileListOpen(true);
          }}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--surface-muted)] text-[var(--text-muted)] hover:text-[var(--text)]"
          aria-label="닫기"
        >
          ×
        </button>
      </div>

      {routeMode ? (
        <div className="mt-4 grid grid-cols-2 gap-2">
          <div className="flex aspect-square flex-col items-center justify-center rounded-[var(--radius-md)] bg-[var(--accent-soft)] px-2 py-3">
            {routeStatus === "loading" ? (
              <p className="text-center text-[12px] text-[var(--text-muted)]">
                경로 찾는 중…
              </p>
            ) : (
              <>
                <p
                  className="text-[32px] font-extrabold leading-none tracking-tight text-[var(--accent)]"
                  style={{ fontFamily: "var(--font-display), sans-serif" }}
                >
                  {etaMin ?? "—"}
                </p>
                <p className="mt-1.5 text-[11px] font-medium text-[var(--text-muted)]">
                  약 분
                </p>
              </>
            )}
          </div>
          <div className="flex aspect-square flex-col items-center justify-center rounded-[var(--radius-md)] bg-[var(--surface-muted)] px-2 py-3">
            {routeStatus === "loading" ? (
              <p className="text-center text-[12px] text-[var(--text-muted)]">…</p>
            ) : (
              <>
                <p
                  className="text-[32px] font-extrabold leading-none tracking-tight text-[var(--text)]"
                  style={{ fontFamily: "var(--font-display), sans-serif" }}
                >
                  {etaKm ?? "—"}
                </p>
                <p className="mt-1.5 text-[11px] font-medium text-[var(--text-muted)]">
                  경로 km
                </p>
              </>
            )}
          </div>
        </div>
      ) : (
        <>
          <div className="mt-3">
            <p className="text-[11px] font-medium text-[var(--text-muted)]">
              충전기 타입
            </p>
            {chargerTypes.length > 0 ? (
              <ul
                className="mt-1.5 flex flex-wrap gap-1.5"
                aria-label="충전기 타입"
              >
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
              <p className="mt-1.5 text-[12px] text-[var(--text-muted)]">
                타입 정보 없음
              </p>
            )}
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <div className="rounded-[var(--radius-md)] bg-[var(--surface-muted)] px-3 py-3">
              {avail.mixed ? (
                <ul className="space-y-2" aria-label="타입별 충전가능">
                  {avail.lines.map((line) => (
                    <li
                      key={line.label}
                      className="flex items-baseline justify-between gap-2"
                    >
                      <span className="text-[11px] text-[var(--text-muted)]">
                        {line.label}
                      </span>
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
                  <p className="mt-1 text-[11px] text-[var(--text-muted)]">
                    {avail.lines[0].label}
                  </p>
                </>
              )}
            </div>
            <div className="rounded-[var(--radius-md)] bg-[var(--surface-muted)] px-3 py-3">
              <p
                className="text-[28px] font-extrabold leading-none tracking-tight text-[var(--text)]"
                style={{ fontFamily: "var(--font-display), sans-serif" }}
              >
                {station.distanceKm != null
                  ? station.distanceKm.toFixed(1)
                  : "—"}
              </p>
              <p className="mt-1 text-[11px] text-[var(--text-muted)]">직선 km</p>
            </div>
          </div>
        </>
      )}

      {routeMode && routeStatus === "ready" && etaLabel ? (
        <p className="mt-3 text-center text-[13px] font-medium text-[var(--text)]">
          {etaLabel}
        </p>
      ) : null}

      {routeMode &&
      routeStatus === "error" &&
      routeError &&
      routeError !== "__UNIMPLEMENTED__" ? (
        <p className="mt-3 text-[12px] text-[var(--danger)]">{routeError}</p>
      ) : null}

      {routeActive && !forThisStation && routeDest ? (
        <div className="mt-3 flex items-center gap-2 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-muted)] px-2 py-1.5">
          <button
            type="button"
            onClick={() => {
              if (routeDest.stationId) {
                // 카메라 이동 없이 길찾기 카드만 복원 (자유주행 중 selectStation 예외와 동일 dest).
                setSelectedId(routeDest.stationId);
              } else {
                setSelectedId(null);
              }
            }}
            className="min-w-0 flex-1 truncate rounded-[var(--radius-md)] px-1.5 py-1 text-left text-[11px] font-medium text-[var(--text)] touch-manipulation hover:bg-white"
            title="길찾기 다시 보기"
          >
            경로 중 · {routeDest.name}
            <span className="ml-1 text-[var(--accent)]">펼치기</span>
          </button>
          <button
            type="button"
            onClick={() => clearDestination()}
            className="shrink-0 rounded-[var(--radius-pill)] px-2.5 py-1 text-[11px] font-semibold text-[var(--danger)] touch-manipulation hover:bg-white"
          >
            안내종료
          </button>
        </div>
      ) : null}

      <div className={routeMode ? "mt-4 flex gap-2" : "mt-4"}>
        {routeMode ? (
          <button
            type="button"
            onClick={() => clearDestination()}
            className="flex flex-1 items-center justify-center rounded-[var(--radius-pill)] border border-[var(--border)] bg-white px-3 py-2.5 text-[13px] font-semibold text-[var(--text-secondary)] transition hover:bg-[var(--surface-muted)] touch-manipulation"
          >
            안내종료
          </button>
        ) : null}
        <button
          type="button"
          onClick={() =>
            startDirections({
              name: station.name ?? station.stationId,
              address: station.address ?? "",
              lat: station.lat,
              lng: station.lng,
              stationId: station.stationId,
            })
          }
          className={[
            "relative flex items-center justify-center gap-1 rounded-[var(--radius-pill)] bg-[var(--accent)] px-4 py-2.5 text-[13px] font-semibold text-white transition hover:opacity-90 touch-manipulation",
            routeMode ? "flex-[1.4]" : "w-full",
          ].join(" ")}
        >
          {routeMode && routeStatus === "ready" ? "다시 길찾기" : "길찾기"}
          <span aria-hidden>›</span>
        
        </button>
      </div>
      
    </article>
  );
}
