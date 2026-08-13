"use client";

import Link from "next/link";
import { BodyPortal } from "@/components/auth/BodyPortal";
import { buildLoginHref } from "@/lib/auth/returnUrl";

type LoginBottomSheetProps = {
  open: boolean;
  onClose: () => void;
  /** Encoded map return path, e.g. `/map?lat=...&lng=...` */
  returnUrl: string;
  message?: string;
  /** null이면 부제 숨김 */
  description?: string | null;
};

/**
 * Context login sheet — favorites / points charge 등에서 사용.
 * 실제 표시 애니메이션·포커스 트랩은 TODO.
 */
export function LoginBottomSheet({
  open,
  onClose,
  returnUrl,
  message = "로그인이 필요합니다",
  description = "즐겨찾기·포인트 등 회원 기능을 쓰려면 로그인해 주세요.",
}: LoginBottomSheetProps) {
  if (!open) return null;

  const loginHref = buildLoginHref(returnUrl);

  return (
    <BodyPortal>
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center bg-black/30 p-3 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="login-sheet-title"
    >
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="닫기"
        onClick={onClose}
      />
      <div className="relative w-full max-w-md animate-fade-up rounded-t-[20px] border border-[var(--border)] bg-white p-5 shadow-[var(--shadow-md)] sm:rounded-[var(--radius-lg)]">
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-[var(--border-strong)] sm:hidden" />
        <h2
          id="login-sheet-title"
          className="text-[17px] font-bold tracking-tight text-[var(--text)]"
          style={{ fontFamily: "var(--font-display), sans-serif" }}
        >
          {message}
        </h2>
        {description ? (
          <p className="mt-1 text-[13px] text-[var(--text-secondary)]">
            {description}
          </p>
        ) : null}

        <Link
          href={loginHref}
          className="mt-5 flex w-full items-center justify-center rounded-[var(--radius-pill)] bg-[var(--text)] px-4 py-3 text-[14px] font-semibold text-white"
        >
          로그인하기
        </Link>

        {/* ========== 일반 회원가입 ==========
            비활성화: 아래 Link 블록 전체를 {/* ... *} 로 감싸면 됨 */}
        <Link
          href={`/signup?returnUrl=${encodeURIComponent(returnUrl)}`}
          className="mt-2 flex w-full items-center justify-center rounded-[var(--radius-pill)] border border-[var(--border-strong)] bg-white px-4 py-3 text-[14px] font-semibold text-[var(--text)]"
        >
          일반 회원가입
        </Link>

        <p className="mt-3 text-center text-[12px] text-[var(--text-muted)]">
          로그인 화면에서 다른 소셜 계정도 선택할 수 있습니다.
        </p>

        <button
          type="button"
          onClick={onClose}
          className="mt-4 w-full py-2 text-[13px] text-[var(--text-secondary)]"
        >
          닫기
        </button>
      </div>
    </div>
    </BodyPortal>
  );
}
