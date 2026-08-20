"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  getChargerTypeLabel,
  isChargerStatusStale,
  isSlowChargerType,
  STATUS_STALE_LABEL,
} from "@/lib/chargerTypes";
import { fetchPointsBalance, fetchWaitChargerRates } from "@/lib/api";
import { useAuthStore } from "@/stores/authStore";
import { carDisplayLabel, useCarStore } from "@/stores/carStore";
import type { Charger, Station } from "@/types/station";

const KWH_PRESETS = [5, 10, 20, 50] as const;
const AMOUNT_PRESETS = [5000, 10000] as const;
const MIN_KWH = 0.01;
const MAX_KWH = 400;
const MIN_AMOUNT = 1000;
const MAX_AMOUNT = 1_000_000;

export type ChargePayMode = "amount" | "usage";

export type ChargePayDraft = {
  mode: ChargePayMode;
  canPay: boolean;
  chgerId: string | null;
  /** 사용량 모드 */
  kwh: number;
  /**
   * 금액 모드: 사용자가 입력한 결제 P
   * 사용량 모드: pre-auth용 잔액(화면 비노출, 슬라이스3까지 기존 API 호환)
   */
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

  const [mode, setMode] = useState<ChargePayMode>("usage");
  const [chgerId, setChgerId] = useState<string | null>(null);
  const [kwhText, setKwhText] = useState("");
  const [amountText, setAmountText] = useState("");
  const [walletBalance, setWalletBalance] = useState(0);
  const [rateByChgerId, setRateByChgerId] = useState<
    Record<string, { rateWon: number | null; usedAvg: boolean }>
  >({});
  const payInputRef = useRef<HTMLDivElement | null>(null);

  const selected = available.find((c) => c.chgerId === chgerId) ?? null;
  const kwh = Number(kwhText.replace(/,/g, ""));
  const kwhOk = Number.isFinite(kwh) && kwh >= MIN_KWH && kwh <= MAX_KWH;
  const amount = Number(amountText.replace(/[^\d]/g, ""));
  const amountOk =
    Number.isInteger(amount) &&
    amount >= MIN_AMOUNT &&
    amount <= MAX_AMOUNT;

  const usageWalletOk =
    walletBalance >= MIN_AMOUNT && walletBalance <= MAX_AMOUNT;

  const blockReason = !isAuthenticated
    ? "로그인해야 결제할 수 있습니다"
    : primaryCar == null
      ? "내 차량에서 대표 차량을 선택하면 이용 결제를 할 수 있습니다"
      : available.length === 0
        ? "대기 중인 충전기가 없습니다"
        : selected == null
          ? "충전기를 선택하세요"
          : mode === "usage"
            ? !kwhOk
              ? `사용량은 ${MIN_KWH}~${MAX_KWH} kWh`
              : !usageWalletOk
                ? "포인트가 부족합니다. 포인트를 충전하세요"
                : null
            : !amountOk
              ? amount > 0 && amount < MIN_AMOUNT
                ? "충전 금액은 1,000P 이상입니다"
                : `충전 금액은 ${MIN_AMOUNT.toLocaleString("ko-KR")}~${MAX_AMOUNT.toLocaleString("ko-KR")}P`
              : amount > walletBalance
                ? "포인트가 부족합니다. 포인트를 충전하세요"
                : null;

  useEffect(() => {
    if (!isAuthenticated) return;
    let cancelled = false;
    fetchPointsBalance()
      .then((b) => {
        if (cancelled) return;
        const bal = Math.max(0, b.balance);
        setWalletBalance(bal);
        const capped = Math.min(bal, MAX_AMOUNT);
        setAmountText(String(capped >= MIN_AMOUNT ? capped : ""));
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

  const limitAmountKrw =
    mode === "amount"
      ? amountOk
        ? amount
        : 0
      : usageWalletOk
        ? Math.min(walletBalance, MAX_AMOUNT)
        : 0;

  useEffect(() => {
    onDraftChange?.({
      mode,
      canPay: blockReason == null,
      chgerId,
      kwh: mode === "usage" && kwhOk ? kwh : 0,
      limitAmountKrw,
    });
    return () => {
      onDraftChange?.({
        mode: "usage",
        canPay: false,
        chgerId: null,
        kwh: 0,
        limitAmountKrw: 0,
      });
    };
  }, [
    mode,
    blockReason,
    chgerId,
    kwh,
    kwhOk,
    limitAmountKrw,
    onDraftChange,
  ]);

  useEffect(() => {
    if (!chgerId) return;
    const el = payInputRef.current;
    if (!el) return;
    const id = window.setTimeout(() => {
      el.scrollIntoView({ block: "center", behavior: "smooth" });
    }, 80);
    return () => window.clearTimeout(id);
  }, [chgerId]);

  const carLabel = primaryCar == null ? "없음" : carDisplayLabel(primaryCar);
  const modeHint =
    mode === "amount"
      ? "입력한 금액만큼 결제합니다"
      : "사용량으로 요금을 계산합니다";

  return (
    <div className="mt-3 space-y-3 [@media(max-height:720px)]:mt-2 [@media(max-height:720px)]:space-y-2.5">
      <p className="text-[11px] font-medium text-[var(--text-muted)]">
        대표 차량 · {carLabel}
      </p>

      {/* 충전기 목록 — 기존과 동일 */}
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
            className="mt-1.5 space-y-1.5"
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
                      "flex w-full items-center justify-between gap-2 rounded-[var(--radius-md)] border px-3 py-2.5 text-left touch-manipulation [@media(max-height:720px)]:py-2",
                      slow ? "border-transparent" : "border-[var(--accent)]",
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
                        {isChargerStatusStale(c.lastUpdated) ? (
                          <span className="font-medium text-[var(--warning)]">
                            {` · ${STATUS_STALE_LABEL}`}
                          </span>
                        ) : null}
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

      {/* 금액 / 사용량 입력 */}
      <div ref={payInputRef}>
        <div
          className="flex gap-1 rounded-[var(--radius-md)] bg-[var(--surface-muted)] p-1"
          role="tablist"
          aria-label="결제 방식"
        >
          {(
            [
              { id: "amount" as const, label: "금액" },
              { id: "usage" as const, label: "사용량" },
            ] as const
          ).map((tab) => {
            const active = mode === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setMode(tab.id)}
                className={[
                  "flex-1 rounded-[8px] py-1.5 text-[12px] font-semibold touch-manipulation transition-colors",
                  active
                    ? "bg-white text-[var(--accent)] shadow-[var(--shadow-sm)]"
                    : "text-[var(--text-muted)] hover:text-[var(--text)]",
                ].join(" ")}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
        <p className="mt-1.5 text-[11px] text-[var(--text-muted)]">{modeHint}</p>
      </div>

      {mode === "usage" ? (
        <div>
          <label
            htmlFor="charge-kwh"
            className="text-[11px] font-medium text-[var(--text-muted)]"
          >
            사용량
          </label>
          <input
            id="charge-kwh"
            type="text"
            inputMode="decimal"
            autoComplete="off"
            value={kwhText}
            onChange={(e) => setKwhText(e.target.value)}
            placeholder="kWh"
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
      ) : (
        <div>
          <label
            htmlFor="charge-amount"
            className="text-[11px] font-medium text-[var(--text-muted)]"
          >
            충전 금액
          </label>
          <input
            id="charge-amount"
            type="text"
            inputMode="numeric"
            autoComplete="off"
            value={amountText}
            onChange={(e) =>
              setAmountText(e.target.value.replace(/[^\d]/g, ""))
            }
            placeholder="1,000 이상"
            className="mt-1.5 w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-white px-3 py-2.5 text-[16px] text-[var(--text)] outline-none"
          />
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {AMOUNT_PRESETS.map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setAmountText(String(n))}
                className="rounded-[var(--radius-pill)] bg-[var(--surface-muted)] px-2.5 py-1 text-[11px] font-semibold text-[var(--text-secondary)] touch-manipulation"
              >
                {n.toLocaleString("ko-KR")}
              </button>
            ))}
          </div>
        </div>
      )}

      {blockReason ? (
        <p className="text-[12px] leading-snug text-[var(--text-muted)]">
          {blockReason}
        </p>
      ) : (
        <p className="text-[12px] leading-snug text-[var(--text-secondary)]">
          {selected?.chgerId}호 ·{" "}
          {mode === "usage"
            ? `${kwh} kWh`
            : `${amount.toLocaleString("ko-KR")}P`}
        </p>
      )}
    </div>
  );
}