"use client";

import { useEffect, useRef, useState } from "react";
import {
  detailAvailabilityLines,
  getChargerTypeLabel,
  // getChargerTypeShortLabel, // 한 줄 스크롤 칩 초안 재활용 시
  isSlowChargerType,
} from "@/lib/chargerTypes";
import { FavoriteStarButton } from "@/components/map/FavoriteStarButton";
import { parkingBarClass, parkingKind } from "@/lib/parking";
import { haversineMeters } from "@/lib/map/stationHit";
import { useLocationStore } from "@/stores/locationStore";
import { useMapStore } from "@/stores/mapStore";
import { useRecommendStore } from "@/stores/recommendStore";
import { useRouteStore } from "@/stores/routeStore";
import { ChargeRequestPanel, type ChargePayDraft } from "@/components/map/ChargeRequestPanel";
import { LoginBottomSheet } from "@/components/auth/LoginBottomSheet";
import { buildMapReturnUrl } from "@/lib/auth/returnUrl";
import { useAuthStore } from "@/stores/authStore";
import {
  cancelUsageOrder,
  completeUsageOrder,
  payUsageOrder,
  preAuthorizeUsageOrder,
  requestUsageOrder,
} from "@/lib/api";


/** 세부 패널 표시용 — 타입/API 연결 시 여기만 교체하면 됨. */
type StationMetaDisplay = {
  useTime: string;
  busiNm: string;
  busiCall: string;
  output: string;
  limitDetail: string;
  trafficYn: string;
};



type MetaRow =
  | { kind: "field"; key: keyof StationMetaDisplay; label: string }
  | { kind: "operator"; label: string };

const META_ROWS: MetaRow[] = [
  { kind: "field", key: "useTime", label: "이용가능시간" },
  { kind: "operator", label: "운영사·연락처" },
  { kind: "field", key: "output", label: "충전기 출력" },
  { kind: "field", key: "limitDetail", label: "이용제한" },
  { kind: "field", key: "trafficYn", label: "교통방해" },
];

/** 예: 전기회사:221-2420 */
function formatOperatorLine(busiNm: string, busiCall: string): string {
  const nm = busiNm.trim() || "—";
  const call = busiCall.trim() || "—";
  if (nm === "—" && call === "—") return "—";
  return `${nm}:${call}`;
}

/** trafficYn: Y → 정체구간, N → 정체없음 */
function formatTrafficYn(value: string | null | undefined): string {
  const v = value?.trim().toUpperCase();
  if (v === "Y") return "정체구간";
  if (v === "N") return "정체없음";
  return "—";
}

function formatOutput(
  min: number | null | undefined,
  max: number | null | undefined,
): string {
  if (min == null && max == null) return "—";
  if (min != null && max != null && min !== max) {
    return `${min}–${max} kW`;
  }
  const v = max ?? min;
  return v != null ? `${v} kW` : "—";
}

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
  const recommendActive = useRecommendStore((s) => s.active);
  const recommendItems = useRecommendStore((s) => s.items);
  const stationsAnchor = useMapStore((s) => s.stationsAnchor);
  const coords = useLocationStore((s) => s.coords);

  const [showMeta, setShowMeta] = useState(false);
  const [chargeMode, setChargeMode] = useState(false);
  const [chargeDraft, setChargeDraft] = useState<ChargePayDraft>({
    canPay: false,
    chgerId: null,
    kwh: 0,
    limitAmountKrw: 0,
  });
  const [chargePaying, setChargePaying] = useState(false);
  const payInFlightRef = useRef(false);
  const [chargePayMessage, setChargePayMessage] = useState<string | null>(null);
  const [chargeSettled, setChargeSettled] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const center = useMapStore((s) => s.center);
  const zoom = useMapStore((s) => s.zoom);
  const radiusKm = useMapStore((s) => s.radiusKm);
  useEffect(() => {
    setShowMeta(false);
    setChargeMode(false);
    setChargeDraft({
      canPay: false,
      chgerId: null,
      kwh: 0,
      limitAmountKrw: 0,
    });
    setChargePaying(false);
    setChargePayMessage(null);
    setChargeSettled(false);
  }, [selectedId]);

  const station = stations.find((s) => s.stationId === selectedId);
  if (!station) return null;
  const stationId = station.stationId;
  const recItem = recommendActive
    ? recommendItems.find((i) => i.statId === stationId)
    : undefined;
  const origin = stationsAnchor ?? coords;
  const fromOriginKm =
    origin != null
      ? haversineMeters(origin, { lat: station.lat, lng: station.lng }) / 1000
      : station.distanceKm;
  const displayStraightKm =
    recItem?.distanceM != null
      ? recItem.distanceM / 1000
      : fromOriginKm;
  async function handleUsagePay() {
    if (
      payInFlightRef.current ||
      chargePaying ||
      !chargeDraft.canPay ||
      chargeDraft.chgerId == null
    ) {
      return;
    }
    payInFlightRef.current = true;
    setChargePaying(true);
    setChargePayMessage(null);
    const idempotencyKey =
      typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `preauth_${Date.now()}`;
    let heldId: number | null = null;
    try {
      const req = await requestUsageOrder(stationId, chargeDraft.chgerId);
      if (!req.ready) {
        setChargePayMessage(req.message);
        return;
      }
      const held = await preAuthorizeUsageOrder({
        statId: stationId,
        chgerId: chargeDraft.chgerId,
        limitAmountKrw: chargeDraft.limitAmountKrw,
        idempotencyKey,
      });
      heldId = held.id;
      await completeUsageOrder(held.id, chargeDraft.kwh);
      const paid = await payUsageOrder(held.id);
      setChargeSettled(true);
      setChargePayMessage(paid.message || "요금 정산이 완료되었습니다");
    } catch (e) {
      if (heldId != null) {
        try {
          await cancelUsageOrder(heldId);
        } catch {
          /* 홀드 롤백 실패 — 화면은 원래 결제 에러 */
        }
      }
      setChargePayMessage(e instanceof Error ? e.message : "결제에 실패했습니다");
    } finally {
      payInFlightRef.current = false;
      setChargePaying(false);
    }
  }

  const META_PLACEHOLDER: StationMetaDisplay = {
    useTime: station.useTime ?? "—",
    busiNm: station.busiNm ?? "—",
    busiCall: station.busiCall ?? "—",
    output: formatOutput(station.outputMin, station.outputMax),
    limitDetail: station.limitDetail ?? "—",
    trafficYn: formatTrafficYn(station.trafficYn),
  };

  const chargerTypes = station.chargerTypes ?? [];
  const parkingTone = parkingKind(station.parkingFree);
  const avail = detailAvailabilityLines(station);
  const availOpenOk =
    station.availableCount != null && station.availableCount > 0;

  function closeChargeMode() {
    setChargeMode(false);
    setChargeSettled(false);
    setChargePayMessage(null);
  }

  function openChargeMode() {
    setShowMeta(false);
    setChargeSettled(false);
    setChargePayMessage(null);
    setChargeMode(true);
  }
  const forThisStation = routeDest?.stationId === station.stationId;
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

  // 길찾기 중에는 세부 패널보다 ETA 우선
  const metaMode = showMeta && !routeMode;

  
  const meta = META_PLACEHOLDER;

  const closeCard = () => {
    setShowMeta(false);
    setChargeMode(false);
    setSelectedId(null);
    // 경로 중이면 목록(half)을 열지 않음 — PlaceSummaryBar Directions 카드 유지
    if (routeActive) {
      useMapStore.getState().setMobileSheetSnap("peek");
      return;
    }
    setMobileListOpen(true);
  };

  return (
    <article
      className={[
        "animate-fade-up w-full border border-[var(--border)] bg-white/95 shadow-[var(--shadow-md)] backdrop-blur-md transition-[max-width,padding,min-height] duration-200",
        routeMode || metaMode || chargeMode
          ? [
              "max-w-[360px] rounded-[var(--radius-lg)] p-5 md:max-w-[380px]",
              // 세부 5줄이 스크롤 없이 들어가도록 meta는 조금 더 여유
              metaMode || chargeMode
                ? "min-h-[min(100%,380px)]"
                : "min-h-[min(100%,340px)]",
            ].join(" ")
          : "max-w-[360px] rounded-[var(--radius-lg)] p-4",
      ].join(" ")}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-medium uppercase tracking-[0.06em] text-[var(--text-muted)]">
            {routeMode
              ? "Directions"
              : metaMode
                ? "Details"
                : chargeMode
                  ? "Charge"
                  : "Station"}
          </p>
          <h3
            className="mt-1 truncate text-[17px] font-bold tracking-tight text-[var(--text)]"
            style={{ fontFamily: "var(--font-display), sans-serif" }}
          >
            {station.name ?? station.stationId}
          </h3>
          {!metaMode ? (
            <p className="mt-1 line-clamp-2 text-[12px] leading-relaxed text-[var(--text-secondary)]">
              {station.address ?? "주소 정보 없음"}
            </p>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {metaMode ? (
            <button
              type="button"
              onClick={() => setShowMeta(false)}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--surface-muted)] text-[15px] text-[var(--text-muted)] touch-manipulation hover:text-[var(--text)]"
              aria-label="요약으로 돌아가기"
            >
              ‹
            </button>
          ) : null}
          <FavoriteStarButton stationId={station.stationId} variant="detail" />
          <button
            type="button"
            onClick={closeCard}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--surface-muted)] text-[var(--text-muted)] touch-manipulation hover:text-[var(--text)]"
            aria-label="닫기"
          >
            ×
          </button>
        </div>
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
      ) : chargeMode ? (
        <div
          className="ev-scroll-panel mt-3 max-h-[min(440px,58dvh)] overflow-y-auto overscroll-contain rounded-[var(--radius-md)] bg-[var(--surface-muted)] px-3 py-1"
          aria-label="충전 요청"
        >
          <ChargeRequestPanel
            station={station}
            onDraftChange={setChargeDraft}
          />
        </div>
      ) : metaMode ? (
        <div
          className="ev-scroll-panel mt-3 max-h-[min(300px,46dvh)] overflow-y-auto overscroll-contain rounded-[var(--radius-md)] bg-[var(--surface-muted)] px-3 py-1"
          aria-label="충전소 세부정보"
        >
          <dl className="divide-y divide-[var(--border)]">
            {META_ROWS.map((row) => {
              if (row.kind === "operator") {
                const nm = meta.busiNm.trim() || "—";
                const call = meta.busiCall.trim() || "—";
                const line = formatOperatorLine(nm, call);
                const canCall = call !== "—";
                return (
                  <div
                    key="operator"
                    className="flex items-start justify-between gap-3 py-2.5"
                  >
                    <dt className="shrink-0 pt-0.5 text-[11px] font-medium text-[var(--text-muted)]">
                      {row.label}
                    </dt>
                    <dd className="min-w-0 text-right text-[13px] font-medium leading-snug text-[var(--text)]">
                      {line === "—" ? (
                        <span>—</span>
                      ) : canCall ? (
                        <a
                          href={`tel:${call.replace(/[^\d+]/g, "")}`}
                          className="break-words text-[var(--accent)] underline-offset-2 touch-manipulation hover:underline"
                        >
                          {nm}:{call}
                        </a>
                      ) : (
                        <span className="break-words">{nm}:—</span>
                      )}
                    </dd>
                  </div>
                );
              }

              const value = meta[row.key];
              return (
                <div
                  key={row.key}
                  className="flex items-start justify-between gap-3 py-2.5"
                >
                  <dt className="shrink-0 pt-0.5 text-[11px] font-medium text-[var(--text-muted)]">
                    {row.label}
                  </dt>
                  <dd className="min-w-0 break-words text-right text-[13px] font-medium leading-snug text-[var(--text)]">
                    {value}
                  </dd>
                </div>
              );
            })}
          </dl>
        </div>
      ) : (
        <>
          {parkingTone ? (
            <div
              className={[
                "mt-2 flex w-full items-center justify-center rounded-[var(--radius-md)] py-1.5 text-[12px] font-semibold tracking-tight",
                parkingBarClass(parkingTone),
              ].join(" ")}
            >
              {parkingTone === "free" ? "무료주차" : "유료주차"}
            </div>
          ) : null}

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
            {/*
              --- 재활용: 짧은 라벨 + 한 줄 가로스크롤 + 탭 시 전체명 ---
              import getChargerTypeShortLabel, typeTipCode state 복구 후 위 ul 대신 사용.

              <div className="mt-1.5">
                <div className="relative">
                  <ul
                    className="flex flex-nowrap gap-1.5 overflow-x-auto overscroll-x-contain pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                    aria-label="충전기 타입"
                  >
                    {chargerTypes.map((code) => {
                      const slow = isSlowChargerType(code);
                      const full = getChargerTypeLabel(code);
                      const active = typeTipCode === code;
                      return (
                        <li key={code} className="shrink-0">
                          <button
                            type="button"
                            onClick={() =>
                              setTypeTipCode((prev) =>
                                prev === code ? null : code,
                              )
                            }
                            aria-pressed={active}
                            aria-label={full}
                            className={[
                              "inline-flex items-center gap-1 rounded-[var(--radius-pill)] px-2 py-0.5 text-[10px] font-medium tracking-tight touch-manipulation",
                              slow
                                ? "bg-[var(--success-soft)] text-[var(--success)]"
                                : "bg-[var(--accent-soft)] text-[var(--accent)]",
                              active ? "ring-1 ring-current/40" : "",
                            ].join(" ")}
                          >
                            <span
                              className={[
                                "h-1 w-1 shrink-0 rounded-full",
                                slow
                                  ? "bg-[var(--success)]"
                                  : "bg-[var(--accent)]",
                              ].join(" ")}
                              aria-hidden
                            />
                            {getChargerTypeShortLabel(code)}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                  {chargerTypes.length > 2 ? (
                    <div
                      className="pointer-events-none absolute inset-y-0 right-0 flex w-9 items-center justify-end bg-gradient-to-l from-white from-40% to-transparent pr-0.5"
                      aria-hidden
                    >
                      <span className="text-[12px] font-semibold text-[var(--text-muted)]">
                        ›
                      </span>
                    </div>
                  ) : null}
                </div>
                {typeTipCode ? (
                  <p className="mt-1.5 text-[11px] leading-snug text-[var(--text-secondary)]">
                    {getChargerTypeLabel(typeTipCode)}
                  </p>
                ) : null}
              </div>
            */}
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled={!availOpenOk}
              onClick={() => {
                if (!availOpenOk) return;
                openChargeMode();
              }}
              aria-label={availOpenOk ? "대기 충전기 선택" : undefined}
              className={[
                "rounded-[var(--radius-md)] bg-[var(--surface-muted)] px-3 py-3 text-left touch-manipulation",
                availOpenOk
                  ? "hover:bg-[var(--accent-soft)]"
                  : "cursor-default",
              ].join(" ")}
            >
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
                        style={{
                          fontFamily: "var(--font-display), sans-serif",
                        }}
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
            </button>
            <div className="rounded-[var(--radius-md)] bg-[var(--surface-muted)] px-3 py-3">
              <p
                className="text-[28px] font-extrabold leading-none tracking-tight text-[var(--text)]"
                style={{ fontFamily: "var(--font-display), sans-serif" }}
              >
                {displayStraightKm != null
                  ? displayStraightKm.toFixed(1)
                  : "—"}
              </p>
              <p className="mt-1 text-[11px] text-[var(--text-muted)]">직선 km</p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowMeta(true)}
            className="mt-3 flex w-full items-center justify-center gap-1 rounded-[var(--radius-md)] py-2 text-[12px] font-semibold text-[var(--accent)] touch-manipulation hover:bg-[var(--accent-soft)]"
          >
            세부정보 보기
            <span aria-hidden>›</span>
          </button>
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
      {chargePayMessage ? (
        <p
          className={[
            "mt-3 text-[13px] leading-snug",
            chargeSettled
              ? "font-semibold text-[var(--accent)]"
              : "text-[var(--text-secondary)]",
          ].join(" ")}
        >
          {chargeSettled ? "정산 완료 · " : ""}
          {chargePayMessage}
        </p>
      ) : null}

      <div className="mt-4 flex gap-2">
        {routeMode ? (
          <button
            type="button"
            onClick={() => clearDestination()}
            className="flex flex-1 items-center justify-center rounded-[var(--radius-pill)] border border-[var(--border)] bg-white px-3 py-2.5 text-[13px] font-semibold text-[var(--text-secondary)] transition hover:bg-[var(--surface-muted)] touch-manipulation"
          >
            안내종료
          </button>
        ) : null}
        {metaMode ? (
          <button
            type="button"
            onClick={() => setShowMeta(false)}
            className="flex flex-1 items-center justify-center rounded-[var(--radius-pill)] border border-[var(--border)] bg-white px-3 py-2.5 text-[13px] font-semibold text-[var(--text-secondary)] transition hover:bg-[var(--surface-muted)] touch-manipulation"
          >
            뒤로
          </button>
        ) : null}
        {!routeMode && !metaMode && !chargeMode ? (
          <button
            type="button"
            onClick={() => {
              if (!isAuthenticated) {
                setLoginOpen(true);
                return;
              }
              setShowMeta(false);
              setChargeMode(true);
            }}
            className="flex flex-1 items-center justify-center rounded-[var(--radius-pill)] border border-[var(--border)] bg-white px-3 py-2.5 text-[13px] font-semibold text-[var(--text-secondary)] transition hover:bg-[var(--surface-muted)] touch-manipulation"
          >
            이용 결제
          </button>
        ) : null}
        {chargeMode && !routeMode ? (
          <button
            type="button"
            onClick={() => closeChargeMode()}
            className="flex flex-1 items-center justify-center rounded-[var(--radius-pill)] border border-[var(--border)] bg-white px-3 py-2.5 text-[13px] font-semibold text-[var(--text-secondary)] transition hover:bg-[var(--surface-muted)] touch-manipulation"
          >
            뒤로
          </button>
        ) : null}
        {chargeMode && !routeMode ? (
          <button
            type="button"
            disabled={
              isAuthenticated &&
              !chargeSettled &&
              !chargePaying &&
              !chargeDraft.canPay
            }
            aria-disabled={
              isAuthenticated &&
              !chargeSettled &&
              !chargePaying &&
              !chargeDraft.canPay
            }
            onClick={() => {
              if (chargeSettled || chargePaying) {
                closeChargeMode();
                return;
              }
              if (!isAuthenticated) {
                setLoginOpen(true);
                return;
              }
              void handleUsagePay();
            }}
            className={[
              "relative flex flex-[1.4] items-center justify-center gap-1 rounded-[var(--radius-pill)] bg-[var(--accent)] px-4 py-2.5 text-[13px] font-semibold text-white touch-manipulation",
              isAuthenticated &&
              !chargeSettled &&
              !chargePaying &&
              !chargeDraft.canPay
                ? "cursor-not-allowed opacity-40"
                : "transition hover:opacity-90",
            ].join(" ")}
          >
            {chargeSettled || chargePaying ? "완료" : "결제"}
            <span aria-hidden>›</span>
          </button>
        ) : (
          <button
            type="button"
            disabled={recommendActive}
            aria-disabled={recommendActive}
            title={
              recommendActive
                ? "아래 AI 목록에서 「이 충전소로 길찾기」를 사용하세요"
                : undefined
            }
            onClick={() => {
              if (recommendActive) return;
              startDirections({
                name: station.name ?? station.stationId,
                address: station.address ?? "",
                lat: station.lat,
                lng: station.lng,
                stationId: station.stationId,
              });
            }}
            className={[
              "relative flex items-center justify-center gap-1 rounded-[var(--radius-pill)] bg-[var(--accent)] px-4 py-2.5 text-[13px] font-semibold text-white touch-manipulation",
              routeMode || metaMode ? "flex-[1.4]" : "flex-[1.3]",
              recommendActive
                ? "cursor-not-allowed opacity-40"
                : "transition hover:opacity-90",
            ].join(" ")}
          >
            {routeMode && routeStatus === "ready" ? "다시 길찾기" : "길찾기"}
            <span aria-hidden>›</span>
          </button>
        )}
      </div>
      <LoginBottomSheet
        open={loginOpen}
        onClose={() => setLoginOpen(false)}
        returnUrl={buildMapReturnUrl({
          lat: center.lat,
          lng: center.lng,
          zoom,
          radius: radiusKm,
        })}
        message="이용 결제는 로그인 시 제공됩니다"
        description={null}
      />
    </article>
  );
}
