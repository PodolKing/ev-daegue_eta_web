"use client";

import { useEffect, useRef, useState } from "react";
import { fetchPointCharges, fetchUsageOrders } from "@/lib/api";
import type { PointChargeItem, UsageOrderItem } from "@/lib/api";
import { useAuthStore } from "@/stores/authStore";

type HistoryTab = "charge" | "usage";

function formatWhen(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const h = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${y}-${m}-${day} ${h}:${min}`;
}

type PointsHistoryPanelProps = {
  onBack: () => void;
};

export function PointsHistoryPanel({ onBack }: PointsHistoryPanelProps) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const [tab, setTab] = useState<HistoryTab>("usage");
  const [usageItems, setUsageItems] = useState<UsageOrderItem[]>([]);
  const [chargeItems, setChargeItems] = useState<PointChargeItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const onBackRef = useRef(onBack);
  onBackRef.current = onBack;

  useEffect(() => {
    window.history.pushState({ evPointsHistory: 1 }, "");
    const onPop = () => {
      onBackRef.current();
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      setUsageItems([]);
      setChargeItems([]);
      setError(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    void (async () => {
      try {
        const [usage, charges] = await Promise.all([
          fetchUsageOrders(20),
          fetchPointCharges(20),
        ]);
        if (cancelled) return;
        setUsageItems(usage.items);
        setChargeItems(charges.items);
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "내역을 불러오지 못했습니다");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

  return (
    <section className="ev-scroll-panel flex h-full min-h-0 w-full flex-col overflow-y-auto bg-[var(--surface)]">
      <div className="shrink-0 border-b border-[var(--border)] px-3 pt-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => window.history.back()}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] border border-[var(--border)] bg-white text-[13px] text-[var(--text-secondary)] touch-manipulation hover:bg-[var(--surface-muted)]"
            aria-label="포인트로"
          >
            ‹
          </button>
          <div className="min-w-0">
            <h2
              className="text-[14px] font-bold tracking-tight text-[var(--text)]"
              style={{ fontFamily: "var(--font-display), sans-serif" }}
            >
              내역
            </h2>
            <p className="mt-0.5 text-[11px] text-[var(--text-secondary)]">
              {isAuthenticated ? "이용 내역" : "로그인하면 내역을 볼 수 있습니다"}
            </p>
          </div>
        </div>

        <div
          className="mt-2.5 flex gap-1"
          role="tablist"
          aria-label="내역 구분"
        >
          {(
            [
              { id: "usage" as const, label: "이용" },
              { id: "charge" as const, label: "포인트 충전" },
            ] as const
          ).map((item) => {
            const active = tab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setTab(item.id)}
                className={[
                  "flex-1 rounded-[10px] px-2 py-1.5 text-[12px] font-medium touch-manipulation transition-colors",
                  active
                    ? "bg-[var(--accent-soft)] text-[var(--accent)]"
                    : "text-[var(--text-muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--text)]",
                ].join(" ")}
              >
                {item.label}
              </button>
            );
          })}
        </div>
        <div className="h-2" />
      </div>

      <div className="px-3 py-3">
        {!isAuthenticated ? (
          <p className="text-[12px] text-[var(--text-muted)]">
            로그인해야 내역을 조회할 수 있습니다
          </p>
        ) : loading ? (
          <p className="text-[12px] text-[var(--text-muted)]">불러오는 중</p>
        ) : error ? (
          <p className="text-[12px] text-[var(--text-muted)]">{error}</p>
        ) : tab === "usage" ? (
          usageItems.length === 0 ? (
            <p className="text-[12px] text-[var(--text-muted)]">이용 내역이 없습니다</p>
          ) : (
            <ul className="divide-y divide-[var(--border)] rounded-[var(--radius-lg)] border border-[var(--border)] bg-white px-3 shadow-[var(--shadow-sm)]">
              {usageItems.map((row) => {
                const kwh = Number(row.kwh);
                return (
                  <li key={row.id} className="flex items-start gap-3 py-2.5">
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-medium text-[var(--text)]">
                        {row.statNm || row.statId || "충전소"}
                      </p>
                      <p className="mt-0.5 text-[11px] text-[var(--text-muted)]">
                        {row.chgerId ?? "—"}호 ·{" "}
                        {Number.isFinite(kwh) ? kwh : row.kwh} kWh · {row.status} ·{" "}
                        {formatWhen(row.createdAt)}
                      </p>
                    </div>
                    <p className="shrink-0 text-[13px] font-semibold tabular-nums text-[var(--text)]">
                      −{row.pointsSpent.toLocaleString()}P
                    </p>
                  </li>
                );
              })}
            </ul>
          )
        ) : chargeItems.length === 0 ? (
          <p className="text-[12px] text-[var(--text-muted)]">
            포인트 충전 내역이 없습니다
          </p>
        ) : (
          <ul className="divide-y divide-[var(--border)] rounded-[var(--radius-lg)] border border-[var(--border)] bg-white px-3 shadow-[var(--shadow-sm)]">
            {chargeItems.map((row) => {
              const ok = row.status === "paid";
              return (
                <li key={row.id} className="flex items-start gap-3 py-2.5">
                  <span
                    className={[
                      "mt-0.5 flex h-8 min-w-[3.25rem] shrink-0 items-center justify-center rounded-full px-2 text-[10px] font-bold uppercase",
                      ok
                        ? "bg-[var(--success-soft)] text-[var(--success)]"
                        : "bg-[var(--surface-muted)] text-[var(--text-secondary)]",
                    ].join(" ")}
                  >
                    {row.status}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-medium text-[var(--text)]">
                      {row.amountKrw.toLocaleString()}원 →{" "}
                      {row.pointsGranted.toLocaleString()}P
                    </p>
                    <p className="mt-0.5 text-[11px] text-[var(--text-muted)]">
                      {formatWhen(row.paidAt ?? row.createdAt)}
                    </p>
                  </div>
                  <p
                    className={[
                      "shrink-0 text-[13px] font-semibold tabular-nums",
                      ok
                        ? "text-[var(--success)]"
                        : "text-[var(--text-muted)]",
                    ].join(" ")}
                  >
                    {ok ? `+${row.pointsGranted.toLocaleString()}` : "—"}
                  </p>
                </li>
              );
            })}
          </ul>
        )}
        <p className="mt-2 px-0.5 text-[11px] text-[var(--text-muted)]">
          {tab === "usage"
            ? "이용 결제는 앱 장부입니다. 현장 충전·방문이 아닙니다."
            : "카드로 포인트를 산 영수증입니다."}
        </p>
      </div>
    </section>
  );
}