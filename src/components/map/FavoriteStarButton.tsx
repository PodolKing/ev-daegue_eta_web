"use client";

import { useState, type MouseEvent } from "react";
import { LoginBottomSheet } from "@/components/auth/LoginBottomSheet";
import { buildMapReturnUrl } from "@/lib/auth/returnUrl";
import { useAuthStore } from "@/stores/authStore";
import { useFavoriteStore } from "@/stores/favoriteStore";
import { useMapStore } from "@/stores/mapStore";

type FavoriteStarButtonProps = {
  stationId: string;
  /** list: 행 안 작은 터치 타깃 / detail: 헤더 원형 버튼 */
  variant?: "list" | "detail";
  className?: string;
};

function StarIcon({ filled }: { filled: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 3.6l2.2 5.4 5.8.4-4.4 3.7 1.4 5.6L12 15.8 6.9 18.7l1.4-5.6L4 9.4l5.8-.4L12 3.6Z"
        stroke="currentColor"
        strokeWidth="1.85"
        strokeLinejoin="round"
        fill={filled ? "currentColor" : "none"}
      />
    </svg>
  );
}

export function FavoriteStarButton({
  stationId,
  variant = "detail",
  className = "",
}: FavoriteStarButtonProps) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const active = useFavoriteStore((s) => Boolean(s.stationIds[stationId]));
  const toggleFavorite = useFavoriteStore((s) => s.toggleFavorite);
  const center = useMapStore((s) => s.center);
  const zoom = useMapStore((s) => s.zoom);
  const radiusKm = useMapStore((s) => s.radiusKm);
  const [loginOpen, setLoginOpen] = useState(false);

  const onClick = (e: MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (!isAuthenticated) {
      setLoginOpen(true);
      return;
    }
    void toggleFavorite(stationId);
  };

  const returnUrl = buildMapReturnUrl({
    lat: center.lat,
    lng: center.lng,
    zoom,
    radius: radiusKm,
  });

  const buttonClass =
    variant === "list"
      ? [
          "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full touch-manipulation transition-colors",
          active
            ? "text-[var(--warning)] hover:bg-[var(--warning-soft)]"
            : "text-[var(--text-muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--warning)]",
          className,
        ].join(" ")
      : [
          "flex h-8 w-8 items-center justify-center rounded-full bg-[var(--surface-muted)] touch-manipulation transition-colors",
          active
            ? "text-[var(--warning)] hover:bg-[var(--warning-soft)]"
            : "text-[var(--text-muted)] hover:text-[var(--warning)]",
          className,
        ].join(" ");

  return (
    <>
      <button
        type="button"
        onClick={onClick}
        aria-label={
          !isAuthenticated
            ? "즐겨찾기 (로그인 필요)"
            : active
              ? "즐겨찾기 해제"
              : "즐겨찾기 추가"
        }
        aria-pressed={isAuthenticated ? active : false}
        className={buttonClass}
      >
        <StarIcon filled={isAuthenticated && active} />
      </button>
      <LoginBottomSheet
        open={loginOpen}
        onClose={() => setLoginOpen(false)}
        returnUrl={returnUrl}
        message="즐겨찾기 기능은 로그인 시 제공됩니다"
        description={null}
      />
    </>
  );
}
