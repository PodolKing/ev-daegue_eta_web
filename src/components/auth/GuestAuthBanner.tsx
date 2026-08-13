"use client";

import Link from "next/link";
import { useAuthStore } from "@/stores/authStore";
import { useMapStore } from "@/stores/mapStore";
import { buildLoginHref, buildMapReturnUrl } from "@/lib/auth/returnUrl";
import { saveMapUiSession } from "@/lib/auth/mapUiSession";

type GuestAuthBannerProps = {
  message: string;
  className?: string;
};

/** 비로그인 패널 상단 안내. 아래 메뉴는 그대로 보여 준다. */
export function GuestAuthBanner({
  message,
  className = "",
}: GuestAuthBannerProps) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const center = useMapStore((s) => s.center);
  const zoom = useMapStore((s) => s.zoom);
  const radiusKm = useMapStore((s) => s.radiusKm);
  const selectedId = useMapStore((s) => s.selectedId);

  if (isAuthenticated) return null;

  const returnUrl = buildMapReturnUrl({
    lat: center.lat,
    lng: center.lng,
    zoom,
    radius: radiusKm,
  });

  return (
    <div
      className={[
        "flex items-center justify-between gap-2 rounded-[10px] bg-[var(--accent-soft)] px-3 py-2",
        className,
      ].join(" ")}
    >
      <p className="min-w-0 text-[12px] font-medium leading-snug text-[var(--accent)]">
        {message}
      </p>
      <Link
        href={buildLoginHref(returnUrl)}
        onClick={() =>
          saveMapUiSession({
            selectedMarker: selectedId,
            openPanel: true,
            filterOption: null,
          })
        }
        className="shrink-0 rounded-[var(--radius-pill)] bg-[var(--text)] px-2.5 py-1 text-[11px] font-semibold text-white touch-manipulation"
      >
        로그인
      </Link>
    </div>
  );
}
