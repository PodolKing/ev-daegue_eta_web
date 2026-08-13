"use client";

import { useState } from "react";
import AddressSearchModal from "@/components/auth/AddressSearchModal";
import { MAIN_NAV, type NavId } from "@/components/layout/IconRail";
import { useAuthStore } from "@/stores/authStore";

const fieldClass =
  "mt-1.5 w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-white px-3 py-2.5 text-[16px] text-[var(--text)] outline-none focus:border-[var(--accent)] sm:text-[14px]";

const readOnlyFieldClass =
  "mt-1.5 w-full cursor-pointer rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-2.5 text-[16px] text-[var(--text)] outline-none sm:text-[14px]";

type MyPagePanelProps = {
  /** 주요 메뉴로 이동 (AppShell selectNav) */
  onSelectNav?: (id: NavId) => void;
};

/**
 * 마이페이지 패널 껍데기.
 * - 회원 정보 수정/삭제 폼 (주소는 AddressSearchModal 재사용)
 * - 주요 메뉴 바로가기
 * - 주변조회·날씨조회 버튼만 (기능 미연결)
 */
export function MyPagePanel({ onSelectNav }: MyPagePanelProps) {
  const user = useAuthStore((s) => s.user);

  const [nickname, setNickname] = useState(user?.nickname ?? "");
  const [address, setAddress] = useState("");
  const [addressDetail, setAddressDetail] = useState("");
  const [userLat, setUserLat] = useState<number | null>(null);
  const [userLng, setUserLng] = useState<number | null>(null);
  const [addressModalOpen, setAddressModalOpen] = useState(false);

  const quickNav = MAIN_NAV.filter((item) => item.id !== "settings");

  return (
    <section className="ev-scroll-panel flex h-full min-h-0 w-full flex-col overflow-y-auto bg-[var(--surface)] px-3 py-3">
      <div className="shrink-0">
        <h2
          className="text-[14px] font-bold tracking-tight text-[var(--text)] sm:text-[18px]"
          style={{ fontFamily: "var(--font-display), sans-serif" }}
        >
          마이페이지
        </h2>
        <p className="mt-0.5 text-[11px] text-[var(--text-secondary)] sm:text-[12px]">
          {user
            ? `${user.nickname}${user.socialProvider ? ` · ${user.socialProvider}` : ""}`
            : "로그인 후 회원 정보를 관리할 수 있습니다"}
        </p>
      </div>

      {/* 주요 메뉴 바로가기 */}
      <div className="mt-3">
        <p className="mb-1.5 text-[11px] font-medium text-[var(--text-secondary)]">
          주요 메뉴
        </p>
        <div className="grid grid-cols-2 gap-1.5">
          {quickNav.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectNav?.(item.id)}
              className="flex items-center gap-2 rounded-[10px] border border-[var(--border)] bg-white px-2.5 py-2 text-left text-[12px] font-medium text-[var(--text)] touch-manipulation hover:bg-[var(--surface-muted)]"
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[8px] bg-[var(--surface-muted)] text-[var(--text-secondary)]">
                {item.icon}
              </span>
              <span className="truncate">{item.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 주변·날씨 조회 껍데기 */}
      <div className="mt-3 flex gap-1.5">
        <button
          type="button"
          className="flex-1 rounded-[10px] border border-[var(--border)] bg-white px-2.5 py-2 text-[12px] font-medium text-[var(--text)] opacity-70 touch-manipulation"
        >
          주변조회
        </button>
        <button
          type="button"
          className="flex-1 rounded-[10px] border border-[var(--border)] bg-white px-2.5 py-2 text-[12px] font-medium text-[var(--text)] opacity-70 touch-manipulation"
        >
          날씨조회
        </button>
      </div>
      <p className="mt-1 text-[10px] text-[var(--text-muted)]">
        주변·날씨 조회는 UI만 — 기능 이후 연결
      </p>

      {/* 회원 정보 수정 */}
      <form
        className="mt-4 flex flex-col gap-3 border-t border-[var(--border)] pt-3"
        onSubmit={(e) => {
          e.preventDefault();
        }}
      >
        <p className="text-[12px] font-semibold text-[var(--text)]">
          회원 정보 수정
        </p>

        <label className="block text-[12px] font-medium text-[var(--text-secondary)]">
          닉네임
          <input
            type="text"
            name="nickname"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            autoComplete="nickname"
            maxLength={30}
            placeholder="표시 이름"
            className={fieldClass}
          />
        </label>

        <div className="block">
          <span className="text-[12px] font-medium text-[var(--text-secondary)]">
            주소
          </span>
          <p className="mt-0.5 text-[11px] text-[var(--text-muted)]">
            가입할 때와 같은 주소 검색을 사용합니다
          </p>
          <div className="mt-1.5 flex gap-2">
            <input
              name="address"
              type="text"
              readOnly
              value={address}
              onClick={() => setAddressModalOpen(true)}
              className={`${readOnlyFieldClass} min-w-0 flex-1`}
              placeholder="주소 검색을 눌러 입력"
              autoComplete="street-address"
            />
            <button
              type="button"
              onClick={() => setAddressModalOpen(true)}
              className="shrink-0 rounded-[var(--radius-md)] border border-[var(--border)] bg-white px-3 py-2.5 text-[13px] font-medium text-[var(--text-secondary)] shadow-[var(--shadow-sm)] touch-manipulation hover:bg-[var(--surface-muted)]"
            >
              주소 검색
            </button>
          </div>
          {userLat != null && userLng != null ? (
            <p className="mt-1 truncate text-[10px] text-[var(--text-muted)]">
              좌표 {userLat.toFixed(5)}, {userLng.toFixed(5)}
            </p>
          ) : null}
        </div>

        <label className="block text-[12px] font-medium text-[var(--text-secondary)]">
          상세주소
          <input
            type="text"
            name="addressDetail"
            value={addressDetail}
            onChange={(e) => setAddressDetail(e.target.value)}
            autoComplete="address-line2"
            placeholder="동·호수, 건물명 등"
            className={fieldClass}
          />
        </label>

        <label className="block text-[12px] font-medium text-[var(--text-secondary)]">
          비밀번호 변경
          <input
            type="password"
            name="newPassword"
            autoComplete="new-password"
            placeholder="변경 시에만 입력"
            className={fieldClass}
          />
        </label>

        <button
          type="submit"
          className="w-full rounded-[var(--radius-pill)] bg-[var(--text)] px-4 py-3 text-[14px] font-semibold text-white shadow-[var(--shadow-sm)] opacity-60"
        >
          정보 저장
        </button>
      </form>

      {/* 회원 삭제 */}
      <div className="mt-4 border-t border-[var(--border)] pt-3 pb-2">
        <p className="text-[12px] font-semibold text-[var(--text)]">회원 삭제</p>
        <p className="mt-1 text-[11px] leading-snug text-[var(--text-muted)]">
          탈퇴 시 즐겨찾기·차량 등 저장된 정보가 함께 정리됩니다.
        </p>
        <button
          type="button"
          className="mt-2 w-full rounded-[var(--radius-md)] border border-[var(--danger)] bg-white px-4 py-2.5 text-[13px] font-medium text-[var(--danger)] opacity-70 touch-manipulation"
        >
          회원 삭제
        </button>
      </div>

      <AddressSearchModal
        open={addressModalOpen}
        onClose={() => setAddressModalOpen(false)}
        onSelect={({ address: next, lat, lng }) => {
          setAddress(next);
          setUserLat(lat);
          setUserLng(lng);
          setAddressModalOpen(false);
        }}
      />
    </section>
  );
}
