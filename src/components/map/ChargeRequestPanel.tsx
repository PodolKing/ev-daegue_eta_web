"use client";

import { useEffect, useMemo, useState } from "react";
import { getChargerTypeLabel, isSlowChargerType } from "@/lib/chargerTypes";
import { fetchPointsBalance, fetchWaitChargerRates } from "@/lib/api";
import { useAuthStore } from "@/stores/authStore";
import { carDisplayLabel, useCarStore } from "@/stores/carStore";
import type { Charger, Station } from "@/types/station";

const KWH_PRESETS = [5, 10, 20, 50];
const MIN_KWH = 0.01;
const MAX_KWH = 400;
const MIN_HOLD = 1000;
const MAX_HOLD = 1_000_000;

export type ChargePayDraft = {
  canPay: boolean;
  chgerId: string | null;
  kwh: number;
  limitAmountKrw: number;
};

type ChargeRequestPanelProps = {
  station: Station;
  onDraftChange?: (draft: ChargePayDraft) => void;
};

function availableChargers(station: Station): Charger[] {
  return (station.chargers ?? [])
    .filter((c) => c.chargerStatus === "2")
    .slice()
    .sort((a, b) => {
      const aSlow = isSlowChargerType(a.chgerType) ? 1 : 0;
      const bSlow = isSlowChargerType(b.chgerType) ? 1 : 0;
      if (aSlow !== bSlow) return aSlow - bSlow;
      const out = (b.output ?? -1) - (a.output ?? -1);
      if (out !== 0) return out;
      return a.chgerId.localeCompare(b.chgerId, "en");
    });
}

export function ChargeRequestPanel({
  station,
  onDraftChange,
}: ChargeRequestPanelProps) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const primaryCar = useCarStore((s) => s.primaryCar);
  const available = useMemo(() => availableChargers(station), [station]);
  const [chgerId, setChgerId] = useState<string | null>(null);
  const [kwhText, setKwhText] = useState("");
  const [limitText, setLimitText] = useState("");
  const [rateByChgerId, setRateByChgerId] = useState<
    Record<string, { rateWon: number | null; usedAvg: boolean }>
  >({});

  const selected = available.find((c) => c.chgerId === chgerId) ?? null;
  const kwh = Number(kwhText.replace(/,/g, ""));
  const kwhOk = Number.isFinite(kwh) && kwh >= MIN_KWH && kwh <= MAX_KWH;
  const limitAmount = Number(limitText.replace(/,/g, ""));
  const limitOk =
    Number.isInteger(limitAmount) &&
    limitAmount >= MIN_HOLD &&
    limitAmount <= MAX_HOLD;

  const blockReason = !isAuthenticated
    ? "로그인해야 결제할 수 있습니다"
    : primaryCar == null
      ? "내 차량에서 대표 차량을 선택하면 이용 결제를 할 수 있습니다"
      : available.length === 0
        ? "대기 중인 충전기가 없습니다"
        : selected == null
          ? "충전기를 선택하세요"
          : !kwhOk
            ? `사용량은 ${MIN_KWH}~${MAX_KWH} kWh`
            : !limitOk
              ? limitAmount > 0 && limitAmount < MIN_HOLD
                ? "한도는 1,000P 이상입니다. 포인트를 충전하세요"
                : `한도는 ${MIN_HOLD.toLocaleString("ko-KR")}~${MAX_HOLD.toLocaleString("ko-KR")}P`
              : null;

  useEffect(() => {
    if (!isAuthenticated) return;
    let cancelled = false;
    fetchPointsBalance()
      .then((b) => {
        if (cancelled) return;
        const capped = Math.min(Math.max(0, b.balance), MAX_HOLD);
        setLimitText(String(capped));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

  useEffect(() => {
    let cancelled = false;
    setRateByChgerId({});
    fetchWaitChargerRates(station.stationId)
      .then((res) => {
        if (cancelled) return;
        const next: Record<string, { rateWon: number | null; usedAvg: boolean }> =
          {};
        for (const row of res.items) {
          const n = Number(row.rateMemberWon);
          next[row.chgerId] = {
            rateWon: Number.isFinite(n) ? n : null,
            usedAvg: row.usedAvg === true,
          };
        }
        setRateByChgerId(next);
      })
      .catch(() => {
        if (!cancelled) setRateByChgerId({});
      });
    return () => {
      cancelled = true;
    };
  }, [station.stationId]);

  useEffect(() => {
    onDraftChange?.({
      canPay: blockReason == null,
      chgerId,
      kwh,
      limitAmountKrw: limitOk ? limitAmount : 0,
    });
    return () => {
      onDraftChange?.({
        canPay: false,
        chgerId: null,
        kwh: 0,
        limitAmountKrw: 0,
      });
    };
  }, [blockReason, chgerId, kwh, limitOk, limitAmount, onDraftChange]);

  const carLabel = primaryCar == null ? "없음" : carDisplayLabel(primaryCar);

  return (
    <div className="mt-3 space-y-3">
      <p className="text-[11px] font-medium text-[var(--text-muted)]">
        대표 차량 · {carLabel}
      </p>

      <div>
        <p className="text-[11px] font-medium text-[var(--text-muted)]">
         충전기 목록
        </p>
        {available.length === 0 ? (
          <p className="mt-1.5 text-[12px] text-[var(--text-muted)]">
            대기 중인 충전기가 없습니다
          </p>
        ) : (
          <ul
            className="ev-scroll-panel mt-1.5 max-h-[13.25rem] space-y-1.5 overflow-y-auto overscroll-contain"
            aria-label="가용 충전기"
          >
            {available.map((c) => {
              const slow = isSlowChargerType(c.chgerType);
              const active = c.chgerId === chgerId;
              const quote = rateByChgerId[c.chgerId];
              return (
                <li key={`${station.stationId}:${c.chgerId}`}>
                  <button
                    type="button"
                    onClick={() => setChgerId(c.chgerId)}
                    aria-pressed={active}
                    className={[
                      "flex w-full items-center justify-between gap-2 rounded-[var(--radius-md)] border px-3 py-2.5 text-left touch-manipulation",
                      slow
                        ? "border-transparent"
                        : "border-[var(--accent)]",
                      active
                        ? "bg-[var(--accent-soft)] ring-1 ring-[var(--accent)]"
                        : "bg-[var(--surface-muted)]",
                    ].join(" ")}
                  >
                    <span className="min-w-0">
                      <span className="block text-[13px] font-semibold text-[var(--text)]">
                        {c.chgerId}호
                        {c.output != null ? ` · ${c.output} kW` : ""}
                      </span>
                      <span className="mt-0.5 block text-[11px] text-[var(--text-muted)]">
                        {getChargerTypeLabel(c.chgerType)}
                        {slow ? " · 완속" : ""}
                      </span>
                    </span>
                    {quote?.rateWon != null ? (
                      <span className="shrink-0 text-right text-[11px] font-semibold tabular-nums text-[var(--text-secondary)]">
                        {quote.rateWon.toLocaleString("ko-KR")}원/kWh
                        {quote.usedAvg ? (
                          <span className="block font-medium text-[var(--text-muted)]">
                            추정
                          </span>
                        ) : null}
                      </span>
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div>
        <label
          htmlFor="charge-kwh"
          className="text-[11px] font-medium text-[var(--text-muted)]"
        >
          사용량 kWh
        </label>
        <input
          id="charge-kwh"
          type="text"
          inputMode="decimal"
          autoComplete="off"
          value={kwhText}
          onChange={(e) => setKwhText(e.target.value)}
          placeholder="직접 입력"
          className="mt-1.5 w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-white px-3 py-2.5 text-[16px] text-[var(--text)] outline-none"
        />
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {KWH_PRESETS.map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setKwhText(String(n))}
              className="rounded-[var(--radius-pill)] bg-[var(--surface-muted)] px-2.5 py-1 text-[11px] font-semibold text-[var(--text-secondary)] touch-manipulation"
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label
          htmlFor="charge-limit"
          className="text-[11px] font-medium text-[var(--text-muted)]"
        >
          한도 P
        </label>
        <input
          id="charge-limit"
          type="text"
          inputMode="numeric"
          autoComplete="off"
          value={limitText}
          onChange={(e) => setLimitText(e.target.value.replace(/[^\d]/g, ""))}
          placeholder="1,000 이상"
          className="mt-1.5 w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-white px-3 py-2.5 text-[16px] text-[var(--text)] outline-none"
        />
      </div>

      {blockReason ? (
        <p className="text-[12px] leading-snug text-[var(--text-muted)]">
          {blockReason}
        </p>
      ) : (
        <p className="text-[12px] leading-snug text-[var(--text-secondary)]">
          {station.stationId} · {selected?.chgerId}호 · {kwh} kWh · 한도{" "}
          {limitAmount.toLocaleString("ko-KR")}P (데모 · 실충전 없음)
        </p>
      )}
    </div>
  );
}
