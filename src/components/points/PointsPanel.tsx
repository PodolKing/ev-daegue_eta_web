"use client";

import { useAuthStore } from "@/stores/authStore";

/** point_transactions.type 껍데기 라벨 */
type MockTxType = "charge" | "use" | "refund" | "bonus";

type MockTx = {
  id: string;
  type: MockTxType;
  amount: number;
  balanceAfter: number;
  memo: string;
  createdAt: string;
};

const TYPE_META: Record<
  MockTxType,
  { label: string; sign: "+" | "-"; tone: string }
> = {
  charge: {
    label: "충전",
    sign: "+",
    tone: "text-[var(--success)] bg-[var(--success-soft)]",
  },
  use: {
    label: "사용",
    sign: "-",
    tone: "text-[var(--text)] bg-[var(--surface-muted)]",
  },
  refund: {
    label: "환불",
    sign: "+",
    tone: "text-[var(--accent)] bg-[var(--accent-soft)]",
  },
  bonus: {
    label: "보너스",
    sign: "+",
    tone: "text-[var(--success)] bg-[var(--success-soft)]",
  },
};

/** 사용 내역 mock — API 연동 전 미리보기 */
const MOCK_TRANSACTIONS: MockTx[] = [
  {
    id: "1",
    type: "charge",
    amount: 10000,
    balanceAfter: 12500,
    memo: "포인트 충전 (테스트)",
    createdAt: "2026-08-10 14:22",
  },
  {
    id: "2",
    type: "bonus",
    amount: 500,
    balanceAfter: 2500,
    memo: "가입 보너스",
    createdAt: "2026-08-08 09:01",
  },
  {
    id: "3",
    type: "use",
    amount: 300,
    balanceAfter: 2000,
    memo: "추천 충전소 조회",
    createdAt: "2026-08-07 18:40",
  },
  {
    id: "4",
    type: "refund",
    amount: 300,
    balanceAfter: 2300,
    memo: "조회 취소 환불",
    createdAt: "2026-08-07 18:55",
  },
];

/**
 * 포인트 패널 mockup.
 * - 현재 잔액(point_wallets.balance / authStore)
 * - 충전·사용 CTA 껍데기
 * - 사용 내역(point_transactions) 리스트 미리보기
 */
export function PointsPanel() {
  const pointsBalance = useAuthStore((s) => s.pointsBalance);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  const balanceLabel =
    pointsBalance == null
      ? isAuthenticated
        ? "—"
        : "0"
      : pointsBalance.toLocaleString();

  return (
    <section className="ev-scroll-panel flex h-full min-h-0 w-full flex-col overflow-y-auto bg-[var(--surface)]">
      <div className="shrink-0 border-b border-[var(--border)] px-3 py-3">
        <h2
          className="text-[14px] font-bold tracking-tight text-[var(--text)] sm:text-[18px]"
          style={{ fontFamily: "var(--font-display), sans-serif" }}
        >
          포인트
        </h2>
        <p className="mt-0.5 text-[11px] text-[var(--text-secondary)] sm:text-[12px]">
          잔액 · 충전 · 사용 내역
        </p>
      </div>

      <div className="flex flex-col gap-3 px-3 py-3">
        {/* 현재 잔액 */}
        <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-white px-4 py-4 shadow-[var(--shadow-sm)]">
          <p className="text-[11px] font-medium text-[var(--text-secondary)]">
            현재 포인트
          </p>
          <p
            className="mt-1 text-[28px] font-extrabold tracking-tight text-[var(--text)]"
            style={{ fontFamily: "var(--font-display), sans-serif" }}
          >
            {balanceLabel}
            <span className="ml-1 text-[14px] font-semibold text-[var(--text-muted)]">
              P
            </span>
          </p>
          <p className="mt-1 text-[11px] text-[var(--text-muted)]">
            DB · point_wallets.balance
            {!isAuthenticated ? " · 로그인 후 동기화" : ""}
          </p>
        </div>

        {/* CTA 껍데기 */}
        <div className="flex gap-1.5">
          <button
            type="button"
            className="flex-1 rounded-[10px] bg-[var(--text)] px-3 py-2.5 text-[13px] font-semibold text-white opacity-60 shadow-[var(--shadow-sm)] touch-manipulation"
          >
            포인트 충전
          </button>
          <button
            type="button"
            className="flex-1 rounded-[10px] border border-[var(--border)] bg-white px-3 py-2.5 text-[13px] font-medium text-[var(--text)] opacity-70 touch-manipulation"
          >
            사용하기
          </button>
        </div>
        <p className="text-[10px] text-[var(--text-muted)]">
          충전·사용은 UI만 — payments / point_transactions API 이후 연결
        </p>

        {/* 사용 내역 */}
        <div>
          <div className="mb-1.5 flex items-baseline justify-between gap-2">
            <h3 className="text-[12px] font-semibold text-[var(--text)]">
              사용 내역
            </h3>
            <span className="text-[10px] text-[var(--text-muted)]">
              mock · point_transactions
            </span>
          </div>

          <ul className="space-y-0.5">
            {MOCK_TRANSACTIONS.map((tx) => {
              const meta = TYPE_META[tx.type];
              return (
                <li key={tx.id}>
                  <div className="flex items-start gap-3 rounded-[var(--radius-md)] px-2.5 py-2.5 hover:bg-[var(--surface-muted)]">
                    <span
                      className={[
                        "mt-0.5 flex h-8 shrink-0 items-center justify-center rounded-full px-2 text-[11px] font-bold",
                        meta.tone,
                      ].join(" ")}
                    >
                      {meta.label}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-medium text-[var(--text)]">
                        {tx.memo}
                      </p>
                      <p className="mt-0.5 text-[11px] text-[var(--text-muted)]">
                        {tx.createdAt}
                        <span className="text-[var(--border-strong)]"> · </span>
                        잔액 {tx.balanceAfter.toLocaleString()} P
                      </p>
                    </div>
                    <p
                      className={[
                        "shrink-0 text-[13px] font-semibold tabular-nums",
                        meta.sign === "+"
                          ? "text-[var(--success)]"
                          : "text-[var(--text)]",
                      ].join(" ")}
                    >
                      {meta.sign}
                      {tx.amount.toLocaleString()}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>

          <div className="mt-2 rounded-[var(--radius-md)] border border-dashed border-[var(--border)] px-3 py-3 text-center text-[11px] text-[var(--text-muted)]">
            실제 내역은 API 연동 후 표시됩니다
          </div>
        </div>
      </div>
    </section>
  );
}
