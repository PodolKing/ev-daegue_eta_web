"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useState } from "react";
import AddressSearchModal from "@/components/auth/AddressSearchModal";
import { getApiBase } from "@/lib/api";
import { DEFAULT_MAP_PATH, sanitizeReturnUrl } from "@/lib/auth/returnUrl";

function formatApiError(detail: unknown, fallback: string): string {
  if (typeof detail === "string" && detail.trim()) return detail;
  if (Array.isArray(detail) && detail.length > 0) {
    const first = detail[0] as { msg?: string };
    if (typeof first?.msg === "string") return first.msg;
  }
  return fallback;
}

function SignupPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnUrl = sanitizeReturnUrl(searchParams.get("returnUrl"));
  const loginHref = `/login?returnUrl=${encodeURIComponent(returnUrl)}`;

  const [address, setAddress] = useState("");
  const [addressDetail, setAddressDetail] = useState("");
  const [userLat, setUserLat] = useState<number | null>(null);
  const [userLng, setUserLng] = useState<number | null>(null);
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const PASSWORD_RULE = /^(?=.*[A-Za-z])(?=.*[^A-Za-z0-9]).{8,}$/;


  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (loading) return;

    const form = e.currentTarget;
    const fd = new FormData(form);
    const nickname = String(fd.get("nickname") ?? "").trim();
    const email = String(fd.get("email") ?? "").trim();
    const password = String(fd.get("password") ?? "");
    const passwordConfirm = String(fd.get("passwordConfirm") ?? "");

    if (!nickname || !email || !password) {
      setFormError("필수 항목을 입력해 주세요");
      return;
    }
    if (password !== passwordConfirm) {
      setFormError("비밀번호가 일치하지 않습니다");
      return;
    }
    if (!PASSWORD_RULE.test(password)) {
      setFormError("비밀번호는 영문과 특수문자를 포함해 8자 이상이어야 합니다");
      return;
    }

    setLoading(true);
    setFormError(null);

    try {
      // 1차: 이메일을 userId로 전달 (email 컬럼 분리 전).
      // address / detailAddress / userLat / userLng 는 optional (BE 스키마 확장 예정 포함)
      const response = await fetch(`${getApiBase()}/api/v1/auth/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: email,
          password,
          nickname,
          address: address.trim() || null,
          detailAddress: addressDetail.trim() || null,
          userLat,
          userLng,
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
        throw new Error(formatApiError(detail, "회원가입에 실패했습니다"));
      }

      router.push(loginHref);
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : "회원가입에 실패했습니다",
      );
    } finally {
      setLoading(false);
    }
  };

  const openAddressSearch = () => setIsAddressModalOpen(true);

  const fieldClass =
    "mt-1.5 w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-white px-3 py-2.5 text-[14px] text-[var(--text)] outline-none focus:border-[var(--accent)]";

  const readOnlyFieldClass =
    "mt-1.5 w-full cursor-pointer rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-2.5 text-[14px] text-[var(--text)] outline-none read-only:focus:border-[var(--accent)]";

  return (
    <div className="flex h-dvh flex-col overflow-y-auto bg-[var(--bg)] px-4 py-10">
      <div className="mx-auto w-full max-w-md">
        <Link
          href={loginHref}
          className="text-[13px] text-[var(--text-secondary)] hover:text-[var(--text)]"
        >
          ← 로그인으로
        </Link>

        <h1
          className="mt-8 text-[28px] font-extrabold tracking-tight text-[var(--text)]"
          style={{ fontFamily: "var(--font-display), sans-serif" }}
        >
          일반 회원가입
        </h1>
        <p className="mt-2 text-[14px] leading-relaxed text-[var(--text-secondary)]">
          이메일로 계정을 만듭니다. 가입 후 지도 화면으로 돌아갑니다.
        </p>

        <form onSubmit={onSubmit} className="mt-8 flex flex-col gap-4">
          <label className="block text-[12px] font-medium text-[var(--text-secondary)]">
            닉네임
            <input
              name="nickname"
              type="text"
              autoComplete="nickname"
              required
              className={fieldClass}
              placeholder="표시 이름"
            />
          </label>

          <label className="block text-[12px] font-medium text-[var(--text-secondary)]">
            이메일
            <input
              name="email"
              type="email"
              autoComplete="email"
              required
              className={fieldClass}
              placeholder="you@example.com"
            />
          </label>

          <label className="block text-[12px] font-medium text-[var(--text-secondary)]">
            비밀번호
            <input
              name="password"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              pattern="(?=.*[A-Za-z])(?=.*[^A-Za-z0-9]).{8,}"
              title="영문과 특수문자를 포함해 8자 이상"
              className={fieldClass}
              placeholder="영문+특수문자 포함 8자 이상"
            />
          </label>

          <label className="block text-[12px] font-medium text-[var(--text-secondary)]">
            비밀번호 확인
            <input
              name="passwordConfirm"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              className={fieldClass}
              placeholder="비밀번호 재입력"
            />
          </label>

          <div className="block">
            <span className="text-[12px] font-medium text-[var(--text-secondary)]">
              주소
            </span>
            <p className="mt-0.5 text-[11px] text-[var(--text-muted)]">
              주소 검색으로 선택 · 상세는 아래 입력
            </p>
            <div className="mt-1.5 flex gap-2">
              <input
                name="address"
                type="text"
                readOnly
                value={address}
                onClick={openAddressSearch}
                className={`${readOnlyFieldClass} min-w-0 flex-1`}
                placeholder="주소 검색을 눌러 입력 (선택)"
                autoComplete="street-address"
              />
              <button
                type="button"
                onClick={openAddressSearch}
                className="shrink-0 rounded-[var(--radius-md)] border border-[var(--border)] bg-white px-3 py-2.5 text-[13px] font-medium text-[var(--text-secondary)] shadow-[var(--shadow-sm)] touch-manipulation hover:bg-[var(--surface-muted)]"
              >
                주소 검색
              </button>
            </div>
          </div>

          <label className="block text-[12px] font-medium text-[var(--text-secondary)]">
            상세주소
            <input
              name="addressDetail"
              type="text"
              value={addressDetail}
              onChange={(e) => setAddressDetail(e.target.value)}
              autoComplete="address-line2"
              className={fieldClass}
              placeholder="동·호수, 건물명 등"
            />
          </label>

          {formError ? (
            <p
              role="alert"
              className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--warning-soft)] px-3 py-2.5 text-[13px] text-[var(--warning)]"
            >
              {formError}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={loading}
            className="mt-2 flex w-full items-center justify-center rounded-[var(--radius-pill)] bg-[var(--text)] px-4 py-3.5 text-[15px] font-semibold text-white shadow-[var(--shadow-sm)] disabled:opacity-60"
          >
            {loading ? "가입 중…" : "가입하기"}
          </button>
        </form>

        <p className="mt-4 text-center text-[12px] text-[var(--text-muted)]">
          <Link
            href={returnUrl || DEFAULT_MAP_PATH}
            className="hover:text-[var(--text)]"
          >
            지도로 돌아가기
          </Link>
        </p>
      </div>

      <AddressSearchModal
        open={isAddressModalOpen}
        onClose={() => setIsAddressModalOpen(false)}
        onSelect={({ address: nextAddress, lat, lng }) => {
          setAddress(nextAddress);
          setUserLat(lat);
          setUserLng(lng);
        }}
      />
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-dvh items-center justify-center text-[13px] text-[var(--text-muted)]">
          로딩…
        </div>
      }
    >
      <SignupPageContent />
    </Suspense>
  );
}
