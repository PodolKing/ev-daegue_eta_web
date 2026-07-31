"use client";

import { useEffect } from "react";
import { useLocationStore } from "@/stores/locationStore";
import { useRouteStore } from "@/stores/routeStore";

/**
 * While a car route is ready, throttle-refresh when 현위치 moves
 * (GPS watch or 자유주행 setTestCoords). MapView stays thin — no fetch here.
 */
export function RouteLiveRefresh() {
  const coords = useLocationStore((s) => s.coords);
  const status = useRouteStore((s) => s.status);
  const maybeRefreshRoute = useRouteStore((s) => s.maybeRefreshRoute);

  useEffect(() => {
    if (status !== "ready" || !coords) return;
    maybeRefreshRoute();
  }, [status, coords?.lat, coords?.lng, maybeRefreshRoute]);

  return null;
}
