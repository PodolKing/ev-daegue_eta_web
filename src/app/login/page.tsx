"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { FormEvent, ReactNode, Suspense, useState } from "react";
import { getApiBase } from "@/lib/api";
import { startOAuthRedirect, type OAuthProvider } from "@/lib/auth/oauth";
import { DEFAULT_MAP_PATH, sanitizeReturnUrl } from "@/lib/auth/returnUrl";
import { useAuthStore } from "@/stores/authStore";

function KakaoIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#191600"
        d="M12 3.2C6.92 3.2 2.8 6.42 2.8 10.4c0 2.52 1.66 4.74 4.18 6.02-.14.52-.9 3.36-.93 3.58 0 0-.18.15.01.3.16.12.32.06.32.06.42-.06 4.86-3.2 5.63-3.74.32.04.65.06.99.06 5.08 0 9.2-3.22 9.2-7.2S17.08 3.2 12 3.2z"
      />
    </svg>
  );
}

function GoogleIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

function NaverIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      <path
        fill="currentColor"
        d="M16.273 12.845 7.376 0H0v24h7.727V11.155L16.624 24H24V0h-7.727v12.845z"
      />
    </svg>
  );
}

function SocialLoginButton({
  provider,
  returnUrl,
  label,
  icon,
  className,
}: {
  provider: OAuthProvider;
  returnUrl: string;
  label: string;
  icon: ReactNode;
  className: string;
}) {
  return (
    <button
      type="button"
      onClick={() => startOAuthRedirect(provider, returnUrl)}
      className={className}
    >
      <span className="pointer-events-none absolute left-3 flex h-7 w-7 items-center justify-center rounded-full bg-black/[0.06]">
        {icon}
      </span>
      <span>{label}</span>
    </button>
  );
}

function formatLoginError(detail: unknown): string {
  if (typeof detail === "string" && detail.trim()) {
    const t = detail.trim();
    if (t.includes("password") || t.includes("userId") || t.includes("id 또는")) {
      return "아이디 또는 비밀번호가 올바르지 않습니다.";
    }
    if (t.includes("JWT_SECRET")) {
      return "서버 인증 설정 오류입니다. 관리자에게 문의해 주세요.";
    }
    return t;
  }
  return "아이디 또는 비밀번호가 올바르지 않습니다.";
}

function LoginPageContent() {
  const searchParams = useSearchParams();
  const returnUrl = sanitizeReturnUrl(searchParams.get("returnUrl"));
  const signupHref = `/signup?returnUrl=${encodeURIComponent(returnUrl)}`;
  const setUser = useAuthStore((s) => s.setUser);
  const setPointsBalance = useAuthStore((s) => s.setPointsBalance);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const btnBase =
    "relative flex w-full items-center justify-center rounded-[var(--radius-pill)] px-4 py-2.5 text-[14px] font-semibold shadow-[var(--shadow-sm)] transition-[filter,transform,box-shadow] duration-150 ease-out touch-manipulation hover:brightness-[0.97] active:scale-[0.985] active:brightness-[0.94] sm:py-3 sm:text-[15px]";

  const socialBtnBase = `${btnBase} gap-2`;

  const fieldClass =
    "mt-1 w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-white px-3 py-2 text-[14px] text-[var(--text)] outline-none focus:border-[var(--accent)] sm:mt-1.5 sm:py-2.5";

  const onLocalLoginSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    setError("");

    const fd = new FormData(e.currentTarget);

    const userId = String(fd.get("userId") ?? "").trim();
    const password = String(fd.get("password") ?? "");

    if (!userId) {
      setError("아이디를 입력해주세요.");
      return;
    }

    if (!password) {
      setError("비밀번호를 입력해주세요.");
      return;
    }

    try {
      setIsLoading(true);

      const response = await fetch(`${getApiBase()}/api/v1/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId,
          password,
        }),
      });

      if (!response.ok) {
        let detail: unknown;
        try {
          const errBody = (await response.json()) as { detail?: unknown };
          detail = errBody.detail;
        } catch {
          detail = undefined;
        }
        setError(formatLoginError(detail));
        setIsLoading(false);
        return;
      }

      const result = (await response.json()) as {
        accessToken?: string;
        user?: {
          id: number;
          nickname: string;
          point?: number;
          socialProvider?: string | null;
        };
      };

      const token =
        typeof result.accessToken === "string"
          ? result.accessToken
          : typeof (result as { access_token?: string }).access_token ===
              "string"
            ? (result as { access_token: string }).access_token
            : "";

      if (token) {
        localStorage.setItem("accessToken", token);
      }

      if (result.user) {
        setUser({
          id: String(result.user.id),
          nickname: result.user.nickname,
          socialProvider: result.user.socialProvider ?? undefined,
        });
        if (typeof result.user.point === "number") {
          setPointsBalance(result.user.point);
        }
      }

      const next = returnUrl || DEFAULT_MAP_PATH;
      window.location.assign(next);
    } catch (err) {
      console.error(err);
      setError("로그인 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-[var(--bg)] px-4 py-4 sm:overflow-y-auto sm:py-10">
      <div className="mx-auto flex w-full max-w-md min-h-0 flex-1 flex-col sm:flex-none sm:min-h-0">
        <Link
          href={returnUrl || DEFAULT_MAP_PATH}
          className="shrink-0 text-[12px] text-[var(--text-secondary)] hover:text-[var(--text)] sm:text-[13px]"
        >
          ← 지도로 돌아가기
        </Link>

        <h1
          className="mt-3 shrink-0 text-[22px] font-extrabold tracking-tight text-[var(--text)] sm:mt-8 sm:text-[28px]"
          style={{ fontFamily: "var(--font-display), sans-serif" }}
        >
          로그인
        </h1>
        <p className="mt-1 hidden text-[14px] leading-relaxed text-[var(--text-secondary)] sm:mt-2 sm:block">
          이메일 또는 소셜 계정으로 시작할 수 있습니다. 지도 위치는 로그인
          후에도 유지됩니다.
        </p>

        <form
          onSubmit={onLocalLoginSubmit}
          className="mt-3 flex shrink-0 flex-col gap-2.5 sm:mt-8 sm:gap-4"
        >
          <label className="block text-[11px] font-medium text-[var(--text-secondary)] sm:text-[12px]">
            이메일
            <input
              name="userId"
              type="email"
              autoComplete="username"
              required
              className={fieldClass}
              placeholder="you@example.com"
            />
          </label>

          <label className="block text-[11px] font-medium text-[var(--text-secondary)] sm:text-[12px]">
            비밀번호
            <input
              name="password"
              type="password"
              autoComplete="current-password"
              required
              className={fieldClass}
              placeholder="비밀번호"
            />
          </label>

          {error ? (
            <p
              role="alert"
              className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--warning-soft)] px-3 py-2 text-[12px] text-[var(--warning)] sm:text-[13px]"
            >
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={isLoading}
            className={`${btnBase} bg-[var(--text)] text-white hover:brightness-110 disabled:opacity-60`}
          >
            {isLoading ? "로그인 중…" : "로그인"}
          </button>
        </form>

        <div className="my-3 flex shrink-0 items-center gap-3 sm:my-6">
          <span className="h-px flex-1 bg-[var(--border)]" />
          <span className="text-[10px] tracking-wide text-[var(--text-muted)] sm:text-[11px]">
            소셜 계정으로 계속
          </span>
          <span className="h-px flex-1 bg-[var(--border)]" />
        </div>

        <div className="flex shrink-0 flex-col gap-2 sm:gap-2.5">
          <SocialLoginButton
            provider="kakao"
            returnUrl={returnUrl}
            label="카카오로 계속하기"
            icon={<KakaoIcon />}
            className={`${socialBtnBase} bg-[#FEE500] text-[#191600] shadow-[0_1px_2px_rgba(25,22,0,0.08)]`}
          />
          <SocialLoginButton
            provider="google"
            returnUrl={returnUrl}
            label="Google로 계속하기"
            icon={<GoogleIcon />}
            className={`${socialBtnBase} border border-[var(--border)] bg-white text-[var(--text)] hover:bg-[var(--surface-muted)]`}
          />
          <SocialLoginButton
            provider="naver"
            returnUrl={returnUrl}
            label="네이버로 계속하기"
            icon={<NaverIcon />}
            className={`${socialBtnBase} bg-[#03C75A] text-white shadow-[0_1px_2px_rgba(0,80,40,0.18)] [&_span:first-child]:bg-white/15`}
          />
        </div>

        <div className="mt-auto flex shrink-0 flex-col items-center gap-2 pt-3 sm:mt-6 sm:pt-0">
          <Link
            href={signupHref}
            className={`${btnBase} w-full border border-[var(--border-strong)] bg-[var(--surface)] text-[var(--text)] hover:bg-[var(--surface-muted)]`}
          >
            일반 회원가입
          </Link>
          <p className="text-center text-[11px] text-[var(--text-muted)] sm:text-[12px]">
            계정이 없나요? 회원가입 또는 소셜로 시작하세요.
          </p>
        </div>
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
