"use client";

import { Suspense, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { handlePostLoginLanding } from "@/lib/auth/oauth";
import { loadMapUiSession } from "@/lib/auth/mapUiSession";
import { parseMapUrlState } from "@/lib/auth/returnUrl";
import { useMapStore } from "@/stores/mapStore";

/**
 * Restore map center/zoom/radius from URL after OAuth return.
 * Business restore details left as TODO for humans.
 */
function useRestoreMapFromUrl() {
  const searchParams = useSearchParams();
  const setCenter = useMapStore((s) => s.setCenter);
  const setZoom = useMapStore((s) => s.setZoom);
  const setRadiusKm = useMapStore((s) => s.setRadiusKm);
  const setSelectedId = useMapStore((s) => s.setSelectedId);

  useEffect(() => {
    const state = parseMapUrlState(searchParams.toString());
    // TODO: apply only when params present; avoid fighting geolocation on first visit
    if (state.lat != null && state.lng != null) {
      setCenter({ lat: state.lat, lng: state.lng });
    }
    if (state.zoom != null) setZoom(state.zoom);
    if (state.radius != null) setRadiusKm(state.radius);

    const ui = loadMapUiSession();
    // TODO: restore selectedMarker / openPanel / filterOption when TTL OK
    if (ui?.selectedMarker) setSelectedId(ui.selectedMarker);

    void handlePostLoginLanding();
  }, [searchParams, setCenter, setZoom, setRadiusKm, setSelectedId]);
}

function MapPageInner() {
  useRestoreMapFromUrl();
  return <AppShell />;
}

export default function MapPage() {
  return (
    <Suspense fallback={<AppShell />}>
      <MapPageInner />
    </Suspense>
  );
}
