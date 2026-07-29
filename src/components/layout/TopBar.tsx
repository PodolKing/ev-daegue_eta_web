"use client";

import Link from "next/link";
import { useAuthStore } from "@/stores/authStore";
import { useMapStore } from "@/stores/mapStore";
import { buildLoginHref, buildMapReturnUrl } from "@/lib/auth/returnUrl";
import { saveMapUiSession } from "@/lib/auth/mapUiSession";

export function TopBar({ apiOnline }: { apiOnline: boolean | null }) {
  const user = useAuthStore((s) => s.user);
  const pointsBalance = useAuthStore((s) => s.pointsBalance);
  const logout = useAuthStore((s) => s.logout);
  const center = useMapStore((s) => s.center);
  const zoom = useMapStore((s) => s.zoom);
  const radiusKm = useMapStore((s) => s.radiusKm);
  const selectedId = useMapStore((s) => s.selectedId);

  const returnUrl = buildMapReturnUrl({
    lat: center.lat,
    lng: center.lng,
    zoom,
    radius: radiusKm,
  });
  const loginHref = buildLoginHref(returnUrl);

  const onLoginClick = () => {
    saveMapUiSession({
      selectedMarker: selectedId,
      openPanel: true,
      filterOption: null,
    });
  };

  return (
    <header className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start justify-between gap-3 p-3 sm:p-4">
      <div className="pointer-events-auto animate-fade-up rounded-[var(--radius-pill)] border border-[var(--border)] bg-white/90 px-4 py-2 shadow-[var(--shadow-sm)] backdrop-blur-md">
        <div className="flex items-center gap-2.5">
          <span
            className={[
              "h-2 w-2 rounded-full",
              apiOnline === true
                ? "bg-[var(--success)]"
                : apiOnline === false
                  ? "bg-[var(--danger)]"
                  : "animate-soft-pulse bg-[var(--text-muted)]",
            ].join(" ")}
          />
          <div>
            <p
              className="text-[13px] font-semibold tracking-tight text-[var(--text)]"
              style={{ fontFamily: "var(--font-display), sans-serif" }}
            >
              EV SafeCharge
            </p>
            <p className="text-[11px] text-[var(--text-muted)]">대구 · 도착 시 충전 가능 추천</p>
          </div>
        </div>
      </div>

      {/* Leave room for TMAP zoomControl (shown from 700px width). */}
      <div className="pointer-events-auto flex items-center gap-2 animate-fade-up [animation-delay:60ms] min-[700px]:mr-14">
        {user ? (
          <div className="flex items-center gap-2 rounded-[var(--radius-pill)] border border-[var(--border)] bg-white/90 px-3 py-1.5 shadow-[var(--shadow-sm)] backdrop-blur-md">
            <span className="text-[12px] text-[var(--text-secondary)]">{user.nickname}</span>
            <span className="rounded-[var(--radius-pill)] bg-[var(--accent-soft)] px-2.5 py-0.5 text-[12px] font-semibold text-[var(--accent)]">
              {pointsBalance == null ? "— P" : `${pointsBalance.toLocaleString()} P`}
            </span>
            <button
              type="button"
              onClick={() => void logout()}
              className="text-[11px] text-[var(--text-muted)] hover:text-[var(--text)]"
            >
              로그아웃
            </button>
          </div>
        ) : (
          <Link
            href={loginHref}
            onClick={onLoginClick}
            className="shrink-0 whitespace-nowrap rounded-[var(--radius-pill)] bg-[var(--text)] px-2.5 py-1.5 text-[11px] font-semibold leading-none text-white shadow-[var(--shadow-sm)] transition hover:opacity-90 min-[360px]:px-3.5 min-[360px]:py-2 min-[360px]:text-[13px]"
          >
            로그인
          </Link>
        )}
      </div>
    </header>
  );
}
