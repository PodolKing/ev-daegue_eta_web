"use client";

import { useEffect, useState } from "react";
import { requestPayment } from "@portone/browser-sdk/v2";
import { GuestAuthBanner } from "@/components/auth/GuestAuthBanner";
import {
  completePointCharge,
  createPointCharge,
  creditPointsApi,
  fetchPointCharges,
  fetchPointsBalance,
  failPointCharge,
  type PointChargeItem,
} from "@/lib/api";
import { useAuthStore } from "@/stores/authStore";

const CHARGE_PRESETS = [1000, 5000, 10000, 50000] as const;
const CREDIT_PRESETS = [1000, 10000, 100000] as const;
/** BE `MIN_CHARGE_KRW` ~ `MAX_CHARGE_KRW` 와 맞춤 */
const CHARGE_MIN_KRW = 1_000;
const CHARGE_MAX_KRW = 1_000_000;
const CREDIT_MIN_P = 1;
const CREDIT_MAX_P = 1_000_000;

function formatWhen(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** 숫자만 남긴 입력 문자열 → 정수. 빈/비숫자면 null */
function parseAmountInput(raw: string): number | null {
  const digits = raw.replace(/[^\d]/g, "");
  if (!digits) return null;
  const n = Number(digits);
  if (!Number.isFinite(n)) return null;
  return n;
}

/** 프리셋 탭 시 현재 입력값에 더함 (빈 칸은 0에서 시작) */
function addToAmountInput(raw: string, add: number): string {
  const cur = parseAmountInput(raw) ?? 0;
  return String(cur + add);
}

/**
 * 포인트 패널 — 잔액·PortOne 충전·ADMIN 충전·충전 주문 내역.
 * mock 레이아웃 유지, 기능만 연결.
 */
export function PointsPanel() {
  const points = useAuthStore((s) => s.pointsBalance);
  const setPointsBalance = useAuthStore((s) => s.setPointsBalance);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const role = useAuthStore((s) => s.user?.role);
  const nickname = useAuthStore((s) => s.user?.nickname) ?? "";
  const isAdmin = role === "ADMIN";

  const [charges, setCharges] = useState<PointChargeItem[]>([]);
  const [listStatus, setListStatus] = useState<"idle" | "loading" | "error">(
    "idle",
  );
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [chargeAmountInput, setChargeAmountInput] = useState("1000");
  const [creditPointsInput, setCreditPointsInput] = useState("10000");
  const [creditNickname, setCreditNickname] = useState("");
  const [creditMemo, setCreditMemo] = useState("");

  const chargeAmountParsed = parseAmountInput(chargeAmountInput);
  const creditPointsParsed = parseAmountInput(creditPointsInput);

  useEffect(() => {
    setCreditNickname("");
  }, [nickname]);

  async function refresh() {
    if (!isAuthenticated) {
      setCharges([]);
      return;
    }
    setListStatus("loading");
    try {
      const [bal, hist] = await Promise.all([
        fetchPointsBalance(),
        fetchPointCharges(20),
      ]);
      setPointsBalance(bal.balance);
      setCharges(hist.items);
      setListStatus("idle");
    } catch {
      setListStatus("error");
    }
  }

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount / auth flip
  }, [isAuthenticated]);

  const pointsLabel =
    points == null
      ? isAuthenticated
        ? "—"
        : "0"
      : points.toLocaleString();

      async function onPortOneCharge() {
        if (!isAuthenticated || busy) return;
        setError(null);
        setMessage(null);
        const amount = chargeAmountParsed;
        if (amount == null) {
          setError("충전 금액을 입력해 주세요");
          return;
        }
        if (amount < CHARGE_MIN_KRW || amount > CHARGE_MAX_KRW) {
          setError(
            `충전 금액은 ${CHARGE_MIN_KRW.toLocaleString()}~${CHARGE_MAX_KRW.toLocaleString()}원입니다`,
          );
          return;
        }
        setBusy(true);
        let paymentId: string | null = null;
        try {
          const created = await createPointCharge(amount);
          paymentId = created.paymentId;
          const payResult = await requestPayment({
            storeId: created.storeId,
            channelKey: created.channelKey,
            paymentId: created.paymentId,
            orderName: created.orderName,
            totalAmount: created.amountKrw,
            currency: "CURRENCY_KRW",
            payMethod: "CARD",
            customer: {
              email: created.customerEmail,
              fullName: created.customerName,
              phoneNumber: "01000000000",
            },
          });
          if (payResult && "code" in payResult && payResult.code != null) {
            throw new Error(
              typeof payResult.message === "string"
                ? payResult.message
                : "결제가 취소되었거나 실패했습니다",
            );
          }
          const done = await completePointCharge(created.paymentId);
          setPointsBalance(done.balance);
          setMessage(done.message || "포인트가 충전되었습니다");
          await refresh();
        } catch (e) {
          if (paymentId) {
            try {
              await failPointCharge(paymentId);
            } catch {
              /* 실패 기록 실패는 원 에러를 가리지 않음 */
            }
          }
          setError(e instanceof Error ? e.message : "충전 실패");
          await refresh();
        } finally {
          setBusy(false);
        }
      }

  async function onAdminCredit() {
    if (!isAuthenticated || !isAdmin || busy) return;
    setError(null);
    setMessage(null);
    const targetNick = creditNickname.trim();
    if (!targetNick) {
      setError("적립할 닉네임을 입력해 주세요");
      return;
    }
    const pts = creditPointsParsed;
    if (pts == null) {
      setError("관리자용 충전 포인트를 입력해 주세요");
      return;
    }
    if (pts < CREDIT_MIN_P || pts > CREDIT_MAX_P) {
      setError(
        `관리자충전은 ${CREDIT_MIN_P.toLocaleString()}~${CREDIT_MAX_P.toLocaleString()}P입니다`,
      );
      return;
    }
    setBusy(true);
    try {
      const done = await creditPointsApi(
        pts,
        targetNick,
        creditMemo.trim() || `관리자 충전 → ${targetNick}`,
      );
      setMessage(done.message || "관리자 충전이 완료되었습니다");
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "관리자 충전 실패");
    } finally {
      setBusy(false);
    }
  }

  const fieldClass =
    "w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-white px-3 py-2.5 text-[16px] text-[var(--text)] outline-none focus:border-[var(--accent)] disabled:opacity-50";
  const presetBtnClass =
    "min-h-10 rounded-[10px] border border-[var(--border)] bg-white px-2 text-[12px] font-semibold tabular-nums text-[var(--text)] touch-manipulation hover:bg-[var(--surface-muted)] disabled:opacity-50";
  const resetBtnClass =
    "min-h-10 rounded-[10px] border border-[var(--border)] bg-[var(--surface-muted)] px-2 text-[12px] font-medium text-[var(--text-secondary)] touch-manipulation hover:bg-white disabled:opacity-50";

  return (
    <section className="ev-scroll-panel flex h-full min-h-0 w-full flex-col overflow-y-auto bg-[var(--surface)]">
      <div className="shrink-0 border-b border-[var(--border)] px-3 py-3">
        <h2
          className="text-[14px] font-bold tracking-tight text-[var(--text)]"
          style={{ fontFamily: "var(--font-display), sans-serif" }}
        >
          포인트
        </h2>
        <p className="mt-0.5 text-[11px] text-[var(--text-secondary)]">
          잔액 확인 · 충전 · 내역
        </p>
        <GuestAuthBanner
          className="mt-2"
          message="로그인해야 포인트를 쓸 수 있습니다"
        />
      </div>

      <div className="flex flex-col gap-3 px-3 py-3">
        {/* 잔액 */}
        <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-white px-4 py-4 shadow-[var(--shadow-sm)]">
          <p className="text-[11px] font-medium text-[var(--text-secondary)]">
            현재 포인트
          </p>
          <p
            className="mt-1 text-[28px] font-extrabold tracking-tight text-[var(--text)]"
            style={{ fontFamily: "var(--font-display), sans-serif" }}
          >
            {pointsLabel}
            <span className="ml-1 text-[14px] font-semibold text-[var(--text-muted)]">
              P
            </span>
          </p>
          <p className="mt-1 text-[11px] text-[var(--text-muted)]">1원 = 1P</p>
        </div>

        {/* 충전 */}
        <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-white px-3 py-3 shadow-[var(--shadow-sm)]">
          <div className="flex items-baseline justify-between gap-2">
            <p className="text-[13px] font-semibold text-[var(--text)]">
              포인트 충전
            </p>
            <p className="text-[10px] text-[var(--text-muted)]">
              {CHARGE_MIN_KRW.toLocaleString()}~
              {CHARGE_MAX_KRW.toLocaleString()}원
            </p>
          </div>

          <label className="mt-3 block text-[11px] font-medium text-[var(--text-secondary)]">
            충전 금액
            <div className="relative mt-1.5">
              <input
                type="text"
                inputMode="numeric"
                value={chargeAmountInput}
                onChange={(e) =>
                  setChargeAmountInput(e.target.value.replace(/[^\d]/g, ""))
                }
                disabled={!isAuthenticated || busy}
                placeholder="금액 입력"
                className={`${fieldClass} pr-10 tabular-nums`}
                autoComplete="off"
              />
              <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-[13px] font-medium text-[var(--text-muted)]">
                원
              </span>
            </div>
            {chargeAmountParsed != null ? (
              <p className="mt-1 text-[11px] tabular-nums text-[var(--text-muted)]">
                {chargeAmountParsed.toLocaleString()}P 적립
              </p>
            ) : null}
          </label>

          <div className="mt-3 grid grid-cols-2 gap-2">
            {CHARGE_PRESETS.map((n) => (
              <button
                key={n}
                type="button"
                disabled={!isAuthenticated || busy}
                onClick={() =>
                  setChargeAmountInput((prev) => addToAmountInput(prev, n))
                }
                className={presetBtnClass}
              >
                +{n.toLocaleString()}원
              </button>
            ))}
            <button
              type="button"
              disabled={!isAuthenticated || busy}
              onClick={() => setChargeAmountInput("")}
              className={`${resetBtnClass} col-span-2`}
            >
              초기화
            </button>
          </div>

          <button
            type="button"
            disabled={!isAuthenticated || busy || chargeAmountParsed == null}
            onClick={() => void onPortOneCharge()}
            className="mt-3 flex min-h-12 w-full items-center justify-center rounded-[12px] bg-[var(--text)] px-3 text-[14px] font-semibold text-white shadow-[var(--shadow-sm)] touch-manipulation disabled:opacity-50"
          >
            {busy
              ? "처리 중…"
              : chargeAmountParsed != null
                ? `${chargeAmountParsed.toLocaleString()}원 결제·충전`
                : "결제·충전"}
          </button>
        </div>

        {isAdmin ? (
          <div className="rounded-[var(--radius-lg)] border border-[var(--accent)]/40 bg-white px-3 py-3 shadow-[var(--shadow-sm)]">
            <div className="flex items-baseline justify-between gap-2">
              <p className="text-[13px] font-semibold text-[var(--text)]">
                관리자 충전
              </p>
              <span className="rounded-full bg-[var(--accent-soft)] px-2 py-0.5 text-[10px] font-semibold text-[var(--accent)]">
                ADMIN
              </span>
            </div>

            <label className="mt-3 block text-[11px] font-medium text-[var(--text-secondary)]">
              대상 닉네임
              <input
                value={creditNickname}
                onChange={(e) => setCreditNickname(e.target.value)}
                disabled={busy}
                className={`mt-1.5 ${fieldClass}`}
                autoComplete="off"
              />
            </label>

            <label className="mt-3 block text-[11px] font-medium text-[var(--text-secondary)]">
              충전 포인트
              <div className="relative mt-1.5">
                <input
                  type="text"
                  inputMode="numeric"
                  value={creditPointsInput}
                  onChange={(e) =>
                    setCreditPointsInput(e.target.value.replace(/[^\d]/g, ""))
                  }
                  disabled={busy}
                  placeholder="포인트 입력"
                  className={`${fieldClass} pr-10 tabular-nums`}
                  autoComplete="off"
                />
                <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-[13px] font-medium text-[var(--text-muted)]">
                  P
                </span>
              </div>
            </label>

            <div className="mt-3 grid grid-cols-2 gap-2">
              {CREDIT_PRESETS.map((n) => (
                <button
                  key={n}
                  type="button"
                  disabled={busy}
                  onClick={() =>
                    setCreditPointsInput((prev) => addToAmountInput(prev, n))
                  }
                  className={presetBtnClass}
                >
                  +{n.toLocaleString()}P
                </button>
              ))}
              <button
                type="button"
                disabled={busy}
                onClick={() => setCreditPointsInput("")}
                className={`${resetBtnClass} col-span-2`}
              >
                초기화
              </button>
            </div>

            <label className="mt-3 block text-[11px] font-medium text-[var(--text-secondary)]">
              메모 (선택)
              <input
                value={creditMemo}
                onChange={(e) => setCreditMemo(e.target.value)}
                disabled={busy}
                className={`mt-1.5 ${fieldClass}`}
                autoComplete="off"
              />
            </label>

            <button
              type="button"
              disabled={busy || creditPointsParsed == null}
              onClick={() => void onAdminCredit()}
              className="mt-3 flex min-h-12 w-full items-center justify-center rounded-[12px] border border-[var(--accent)] bg-[var(--accent-soft)] px-3 text-[14px] font-semibold text-[var(--text)] touch-manipulation disabled:opacity-50"
            >
              {busy
                ? "처리 중…"
                : creditPointsParsed != null
                  ? `${creditPointsParsed.toLocaleString()}P 관리자 충전`
                  : "관리자 충전"}
            </button>
          </div>
        ) : null}

        {error ? (
          <p
            className="rounded-[10px] bg-[var(--danger)]/10 px-3 py-2 text-[12px] text-[var(--danger)]"
            role="alert"
          >
            {error}
          </p>
        ) : null}
        {message ? (
          <p
            className="rounded-[10px] bg-[var(--accent-soft)] px-3 py-2 text-[12px] text-[var(--accent)]"
            role="status"
          >
            {message}
          </p>
        ) : null}

        <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-white px-3 py-3 shadow-[var(--shadow-sm)]">
          <div className="mb-2 flex items-baseline justify-between gap-2">
            <h3 className="text-[13px] font-semibold text-[var(--text)]">
              충전 내역
            </h3>
            {listStatus === "loading" ? (
              <span className="text-[11px] text-[var(--text-muted)]">
                불러오는 중…
              </span>
            ) : isAuthenticated && charges.length > 0 ? (
              <span className="text-[11px] text-[var(--text-muted)]">
                최근 {charges.length}건
              </span>
            ) : null}
          </div>

          {!isAuthenticated ? (
            <p className="px-1 py-2 text-[12px] text-[var(--text-muted)]">
              로그인 후 내역을 볼 수 있습니다
            </p>
          ) : listStatus === "error" ? (
            <p className="px-1 py-2 text-[12px] text-[var(--danger)]">
              내역을 불러오지 못했습니다
            </p>
          ) : charges.length === 0 ? (
            <p className="px-1 py-2 text-[12px] text-[var(--text-muted)]">
              충전 내역이 없습니다
            </p>
          ) : (
            <ul className="divide-y divide-[var(--border)]">
              {charges.map((tx) => {
                const ok = tx.status === "paid";
                return (
                  <li key={tx.id}>
                    <div className="flex items-start gap-3 py-2.5 first:pt-0 last:pb-0">
                      <span
                        className={[
                          "mt-0.5 flex h-8 min-w-[3.25rem] shrink-0 items-center justify-center rounded-full px-2 text-[10px] font-bold uppercase",
                          ok
                            ? "bg-[var(--success-soft)] text-[var(--success)]"
                            : "bg-[var(--surface-muted)] text-[var(--text-secondary)]",
                        ].join(" ")}
                      >
                        {tx.status}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] font-medium text-[var(--text)]">
                          {tx.amountKrw.toLocaleString()}원 →{" "}
                          {tx.pointsGranted.toLocaleString()}P
                        </p>
                        <p className="mt-0.5 text-[11px] text-[var(--text-muted)]">
                          {formatWhen(tx.paidAt ?? tx.createdAt)}
                        </p>
                      </div>
                      <p className="shrink-0 text-[13px] font-semibold tabular-nums text-[var(--success)]">
                        +{tx.pointsGranted.toLocaleString()}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}