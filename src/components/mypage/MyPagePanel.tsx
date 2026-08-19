"use client";

import { useEffect, useState } from "react";
import AddressSearchModal from "@/components/auth/AddressSearchModal";
import { GuestAuthBanner } from "@/components/auth/GuestAuthBanner";
import { MAIN_NAV, type NavId } from "@/components/layout/IconRail";
import { HelpGuidePanel } from "@/components/mypage/HelpGuidePanel";
import { useAuthStore } from "@/stores/authStore";

const fieldClass =
  "mt-1.5 w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-white px-3 py-2.5 text-[16px] text-[var(--text)] outline-none focus:border-[var(--accent)] sm:text-[14px] disabled:cursor-not-allowed disabled:bg-[var(--surface-muted)] disabled:opacity-70";

const readOnlyFieldClass =
  "mt-1.5 w-full cursor-pointer rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-2.5 text-[16px] text-[var(--text)] outline-none sm:text-[14px] disabled:cursor-not-allowed disabled:opacity-70";

const rowBtnClass =
  "flex w-full items-center gap-2 rounded-[10px] border border-[var(--border)] bg-white px-2.5 py-2.5 text-left text-[12px] font-medium text-[var(--text)] touch-manipulation hover:bg-[var(--surface-muted)] disabled:cursor-not-allowed disabled:opacity-70";

type MyPagePanelProps = {
  onSelectNav?: (id: NavId) => void;
};

export function MyPagePanel({ onSelectNav }: MyPagePanelProps) {
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const updateProfile = useAuthStore((s) => s.updateProfile);
  const withdraw = useAuthStore((s) => s.withdraw);

  const [profileOpen, setProfileOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [nickname, setNickname] = useState("");
  const [address, setAddress] = useState("");
  const [addressDetail, setAddressDetail] = useState("");
  const [userLat, setUserLat] = useState<number | null>(null);
  const [userLng, setUserLng] = useState<number | null>(null);
  const [addressModalOpen, setAddressModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formOk, setFormOk] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setNickname("");
      setAddress("");
      setAddressDetail("");
      setUserLat(null);
      setUserLng(null);
      return;
    }
    setNickname(user.nickname ?? "");
    setAddress(user.address ?? "");
    setAddressDetail(user.detailAddress ?? "");
    setUserLat(typeof user.userLat === "number" ? user.userLat : null);
    setUserLng(typeof user.userLng === "number" ? user.userLng : null);
  }, [user]);

  const quickNav = MAIN_NAV.filter((item) => item.id !== "settings");
  const formLocked = !isAuthenticated || saving || withdrawing;

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (formLocked) return;
    setFormError(null);
    setFormOk(null);
    const nick = nickname.trim();
    if (!nick) {
      setFormError("닉네임을 입력해 주세요");
      return;
    }
    setSaving(true);
    try {
      await updateProfile({
        nickname: nick,
        address: address.trim() || null,
        detailAddress: addressDetail.trim() || null,
        userLat,
        userLng,
      });
      setFormOk("회원 정보가 저장되었습니다");
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "저장에 실패했습니다");
    } finally {
      setSaving(false);
    }
  }

  async function handleWithdraw() {
    if (formLocked) return;
    const ok = window.confirm(
      "정말 탈퇴하시겠습니까? 탈퇴 후 이 계정으로 로그인할 수 없습니다.",
    );
    if (!ok) return;
    setFormError(null);
    setFormOk(null);
    setWithdrawing(true);
    try {
      await withdraw();
      onSelectNav?.("map");
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "탈퇴에 실패했습니다");
      setWithdrawing(false);
    }
  }

  if (helpOpen) {
    return (
      <HelpGuidePanel
        onBack={() => setHelpOpen(false)}
        onSelectNav={(id) => {
          setHelpOpen(false);
          onSelectNav?.(id);
        }}
      />
    );
  }

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
            ? `${user.nickname}${user.provider ? ` · ${user.provider}` : ""}`
            : "로그인 후 회원 정보를 관리할 수 있습니다"}
        </p>
        <GuestAuthBanner
          className="mt-2"
          message="로그인해야 회원 정보를 수정할 수 있습니다"
        />
      </div>

      {/* 내 정보 수정 — 상단 접기/펴기 */}
      <div className="mt-3 shrink-0">
        <button
          type="button"
          onClick={() => setProfileOpen((v) => !v)}
          aria-expanded={profileOpen}
          className="flex w-full min-h-10 items-center justify-between gap-2 rounded-[10px] border border-[var(--border)] bg-white px-3 py-2.5 text-left touch-manipulation hover:bg-[var(--surface-muted)]"
        >
          <span className="text-[13px] font-semibold text-[var(--text)]">
            내 정보 수정
          </span>
          <span className="text-[11px] text-[var(--text-muted)]">
            {profileOpen ? "접기" : "펼치기"}
          </span>
        </button>

        {profileOpen ? (
          <div className="mt-2 rounded-[10px] border border-[var(--border)] bg-white px-3 py-3">
            <form className="flex flex-col gap-3" onSubmit={handleSave}>
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
                  disabled={formLocked}
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
                    onClick={() => {
                      if (!formLocked) setAddressModalOpen(true);
                    }}
                    disabled={formLocked}
                    className={`${readOnlyFieldClass} min-w-0 flex-1`}
                    placeholder="주소 검색을 눌러 입력"
                    autoComplete="street-address"
                  />
                  <button
                    type="button"
                    onClick={() => setAddressModalOpen(true)}
                    disabled={formLocked}
                    className="shrink-0 rounded-[var(--radius-md)] border border-[var(--border)] bg-white px-3 py-2.5 text-[13px] font-medium text-[var(--text-secondary)] shadow-[var(--shadow-sm)] touch-manipulation hover:bg-[var(--surface-muted)] disabled:cursor-not-allowed disabled:opacity-70"
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
                  disabled={formLocked}
                  className={fieldClass}
                />
              </label>

              <p className="text-[11px] text-[var(--text-muted)]">
                비밀번호 변경은 이후 연결. 좌표는 주소 검색 후 저장 시 함께
                반영됩니다.
              </p>

              {formError ? (
                <p className="text-[12px] text-[var(--danger)]" role="alert">
                  {formError}
                </p>
              ) : null}
              {formOk ? (
                <p className="text-[12px] text-[var(--accent)]" role="status">
                  {formOk}
                </p>
              ) : null}

              <button
                type="submit"
                disabled={formLocked}
                className="w-full rounded-[var(--radius-pill)] bg-[var(--text)] px-4 py-3 text-[14px] font-semibold text-white shadow-[var(--shadow-sm)] touch-manipulation disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving ? "저장 중…" : "정보 저장"}
              </button>
            </form>

            <div className="mt-4 border-t border-[var(--border)] pt-3">
              <p className="text-[12px] font-semibold text-[var(--text)]">
                회원 삭제
              </p>
              <p className="mt-1 text-[11px] leading-snug text-[var(--text-muted)]">
                탈퇴하면 이 계정으로 다시 로그인할 수 없습니다.
                <br />
                즐겨찾기·차량·포인트는 더 이상 이용할 수 없습니다.
              </p>
              <button
                type="button"
                onClick={handleWithdraw}
                disabled={formLocked}
                className="mt-2 w-full rounded-[var(--radius-md)] border border-[var(--danger)] bg-white px-4 py-3 text-[13px] font-medium text-[var(--danger)] touch-manipulation disabled:cursor-not-allowed disabled:opacity-50"
              >
                {withdrawing ? "처리 중…" : "회원 삭제"}
              </button>
            </div>
          </div>
        ) : null}
      </div>

      {/* 주요 메뉴 — 일렬 */}
      <div className="mt-3">
        <p className="mb-1.5 text-[11px] font-medium text-[var(--text-secondary)]">
          주요 메뉴
        </p>
        <div className="flex flex-col gap-1.5">
          {quickNav.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectNav?.(item.id)}
              className={rowBtnClass}
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[8px] bg-[var(--surface-muted)] text-[var(--text-secondary)]">
                {item.icon}
              </span>
              <span className="truncate">{item.label}</span>
            </button>
          ))}
       
          <button
            type="button"
            onClick={() => setHelpOpen(true)}
            className={rowBtnClass}
          >
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[8px] bg-[var(--surface-muted)] text-[11px] font-semibold text-[var(--text-secondary)]">
              ?
            </span>
            <span className="min-w-0 flex-1 truncate">사용 안내</span>
          </button>
        </div>
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
