"use client";

import { useEffect, useMemo, useState } from "react";
import { getChargerTypeLabel, isSlowChargerType } from "@/lib/chargerTypes";
import { useAuthStore } from "@/stores/authStore";
import { carDisplayLabel, useCarStore } from "@/stores/carStore";
import type { Charger, Station } from "@/types/station";

const KWH_PRESETS = [5, 10, 20, 50];
const MIN_KWH = 0.01;
const MAX_KWH = 400;

type ChargeRequestPanelProps = {
  station: Station;
  onCanPayChange?: (canPay: boolean) => void;
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
  onCanPayChange,
}: ChargeRequestPanelProps) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const primaryCar = useCarStore((s) => s.primaryCar);
  const available = useMemo(() => availableChargers(station), [station]);
  const [chgerId, setChgerId] = useState<string | null>(null);
  const [kwhText, setKwhText] = useState("");

  const selected = available.find((c) => c.chgerId === chgerId) ?? null;
  const kwh = Number(kwhText.replace(/,/g, ""));
  const kwhOk = Number.isFinite(kwh) && kwh >= MIN_KWH && kwh <= MAX_KWH;

  const blockReason = !isAuthenticated
    ? "로그인해야 충전 요청을 할 수 있습니다"
    : primaryCar == null
      ? "내 차량에서 대표 차량을 선택하면 충전 서비스를 이용할 수 있습니다"
      : available.length === 0
        ? "대기 중인 충전기가 없습니다"
        : selected == null
          ? "충전기를 선택하세요"
          : !kwhOk
            ? `사용량은 ${MIN_KWH}~${MAX_KWH} kWh`
            : null;

  useEffect(() => {
    onCanPayChange?.(blockReason == null);
    return () => onCanPayChange?.(false);
  }, [blockReason, onCanPayChange]);

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

      {blockReason ? (
        <p className="text-[12px] leading-snug text-[var(--text-muted)]">
          {blockReason}
        </p>
      ) : (
        <p className="text-[12px] leading-snug text-[var(--text-secondary)]">
          {station.stationId} · {selected?.chgerId}호 · {kwh} kWh (데모 · 실충전 없음)
        </p>
      )}
    </div>
  );
}