"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { startOAuthRedirect, type OAuthProvider } from "@/lib/auth/oauth";
import { DEFAULT_MAP_PATH, sanitizeReturnUrl } from "@/lib/auth/returnUrl";

function SocialLoginButton({
  provider,
  returnUrl,
  label,
  className,
}: {
  provider: OAuthProvider;
  returnUrl: string;
  label: string;
  className: string;
}) {
  return (
    <button
      type="button"
      onClick={() => startOAuthRedirect(provider, returnUrl)}
      className={className}
    >
      {label}
    </button>
  );
}

function LoginPageContent() {
  const searchParams = useSearchParams();
  const returnUrl = sanitizeReturnUrl(searchParams.get("returnUrl"));
  const signupHref = `/signup?returnUrl=${encodeURIComponent(returnUrl)}`;

  const btnBase =
    "flex w-full items-center justify-center rounded-[var(--radius-pill)] px-4 py-3.5 text-[15px] font-semibold shadow-[var(--shadow-sm)]";

  return (
    <div className="flex h-dvh flex-col overflow-y-auto bg-[var(--bg)] px-4 py-10">
      <div className="mx-auto w-full max-w-md">
        <Link
          href={returnUrl || DEFAULT_MAP_PATH}
          className="text-[13px] text-[var(--text-secondary)] hover:text-[var(--text)]"
        >
          ← 지도로 돌아가기
        </Link>

        <h1
          className="mt-8 text-[28px] font-extrabold tracking-tight text-[var(--text)]"
          style={{ fontFamily: "var(--font-display), sans-serif" }}
        >
          로그인
        </h1>
        <p className="mt-2 text-[14px] leading-relaxed text-[var(--text-secondary)]">
          소셜 계정 또는 이메일로 시작할 수 있습니다. 지도 위치는 로그인 후에도
          유지됩니다.
        </p>

        <div className="mt-8 flex flex-col gap-3">
          {/* ========== Kakao ==========
              비활성화: 아래 SocialLoginButton 블록 전체를 {/* ... *} 로 감싸면 됨 */}
          <SocialLoginButton
            provider="kakao"
            returnUrl={returnUrl}
            label="카카오 로그인"
            className={`${btnBase} bg-[#FEE500] text-[#191600]`}
          />

          {/* ========== Google ==========
              비활성화: 아래 SocialLoginButton 블록 전체를 {/* ... *} 로 감싸면 됨 */}
          <SocialLoginButton
            provider="google"
            returnUrl={returnUrl}
            label="Google 로그인"
            className={`${btnBase} border border-[var(--border)] bg-white text-[var(--text)]`}
          />

          {/* ========== Naver ==========
              비활성화: 아래 SocialLoginButton 블록 전체를 {/* ... *} 로 감싸면 됨 */}
          <SocialLoginButton
            provider="naver"
            returnUrl={returnUrl}
            label="네이버 로그인"
            className={`${btnBase} bg-[#03C75A] text-white`}
          />
        </div>

        <div className="my-6 flex items-center gap-3">
          <span className="h-px flex-1 bg-[var(--border)]" />
          <span className="text-[11px] text-[var(--text-muted)]">또는</span>
          <span className="h-px flex-1 bg-[var(--border)]" />
        </div>

        {/* ========== 일반 회원가입 ==========
            비활성화: 아래 Link 블록 전체를 {/* ... *} 로 감싸면 됨 */}
        <Link
          href={signupHref}
          className={`${btnBase} border border-[var(--border-strong)] bg-[var(--surface)] text-[var(--text)]`}
        >
          일반 회원가입
        </Link>

        <p className="mt-4 text-center text-[12px] text-[var(--text-muted)]">
          이미 계정이 있나요? 소셜 로그인으로 바로 이용할 수 있습니다.
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-dvh items-center justify-center text-[13px] text-[var(--text-muted)]">
          로딩…
        </div>
      }
    >
      <LoginPageContent />
    </Suspense>
  );
}
