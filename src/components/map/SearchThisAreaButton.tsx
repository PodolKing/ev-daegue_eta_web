"use client";

import { useEffect, useState } from "react";
import {
  DEBUG_FORCE_SHOW_SEARCH_THIS_AREA,
  EXIT_NEAR_GPS_M,
  FOLLOW_IDLE_MS,
  FOLLOW_MOVE_MIN_M,
  HIDE_BUTTON_MIN_M,
  SEARCH_THIS_AREA_ALLOW,
  SHOW_BUTTON_MIN_M,
} from "@/lib/map/mapSearchPolicy";
import { haversineMeters } from "@/lib/map/stationHit";
import {
  readLiveMapCenter,
  useSyncMapCenterFromCamera,
} from "@/lib/map/useSyncMapCenterFromCamera";
import { useLocationStore } from "@/stores/locationStore";
import { useMapStore } from "@/stores/mapStore";
import { useRecommendStore } from "@/stores/recommendStore";
import { useRouteStore } from "@/stores/routeStore";

const chipClassName = `
  rounded-[var(--radius-pill)]
  border border-[var(--border)]
  bg-white/90
  px-3.5 py-2
  text-[13px] font-semibold tracking-tight
  text-[var(--text-secondary)]
  shadow-[var(--shadow-sm)]
  backdrop-blur-md
  touch-manipulation
  transition-[background-color,border-color,color,opacity] duration-200
  hover:bg-white
  hover:text-[var(--text)]
  active:bg-[var(--surface-muted)]
`;

/**
 * 같은 칩 스위칭: 「주변 탐색하기」↔「현위치로 돌아가기」
 * map 모드: pan idle 연속 조회 / 원 없음. OFF는 칩·◎·GPS 근처.
 */
export function SearchThisAreaButton() {
  useSyncMapCenterFromCamera();

  const center = useMapStore((s) => s.center);
  const map = useMapStore((s) => s.map);
  const stationsAnchor = useMapStore((s) => s.stationsAnchor);
  const setStationsAnchor = useMapStore((s) => s.setStationsAnchor);
  const setCenter = useMapStore((s) => s.setCenter);
  const setMobileSheetSnap = useMapStore((s) => s.setMobileSheetSnap);
  const coords = useLocationStore((s) => s.coords);
  const setFollow = useLocationStore((s) => s.setFollow);
  const locateOnce = useLocationStore((s) => s.locateOnce);
  const recommendActive = useRecommendStore((s) => s.active);
  const routeStatus = useRouteStore((s) => s.status);
  const [offerVisible, setOfferVisible] = useState(false);

  const isMapExplore = stationsAnchor?.source === "map";
  const navigating = routeStatus === "loading" || routeStatus === "ready";

  const allowEntry = (() => {
    if (recommendActive) return SEARCH_THIS_AREA_ALLOW.whileAiRecommend;
    if (navigating) return SEARCH_THIS_AREA_ALLOW.whileNavigating;
    if (stationsAnchor?.source === "destination") {
      return SEARCH_THIS_AREA_ALLOW.whileDestinationPin;
    }
    return SEARCH_THIS_AREA_ALLOW.whileHere;
  })();

  const offerOrigin =
    stationsAnchor?.source === "destination" ? stationsAnchor : coords;

  useEffect(() => {
    if (isMapExplore || !allowEntry) {
      setOfferVisible(false);
      return;
    }
    if (!offerOrigin) {
      setOfferVisible(false);
      return;
    }
    const d = haversineMeters(offerOrigin, center);
    setOfferVisible((prev) => {
      if (prev) return d >= HIDE_BUTTON_MIN_M;
      return d >= SHOW_BUTTON_MIN_M;
    });
  }, [
    isMapExplore,
    allowEntry,
    offerOrigin?.lat,
    offerOrigin?.lng,
    center.lat,
    center.lng,
  ]);

  useEffect(() => {
    if (!isMapExplore) return;

    if (coords && haversineMeters(center, coords) < EXIT_NEAR_GPS_M) {
      setStationsAnchor(null);
      return;
    }

    const timer = window.setTimeout(() => {
      const cam = readLiveMapCenter();
      const anchor = useMapStore.getState().stationsAnchor;
      if (anchor?.source !== "map") return;

      if (coords && haversineMeters(cam, coords) < EXIT_NEAR_GPS_M) {
        setStationsAnchor(null);
        return;
      }

      if (haversineMeters(anchor, cam) < FOLLOW_MOVE_MIN_M) return;
      setStationsAnchor({ lat: cam.lat, lng: cam.lng, source: "map" });
    }, FOLLOW_IDLE_MS);

    return () => window.clearTimeout(timer);
  }, [
    isMapExplore,
    center.lat,
    center.lng,
    coords?.lat,
    coords?.lng,
    setStationsAnchor,
  ]);

  const panTo = (lat: number, lng: number) => {
    setCenter({ lat, lng });
    if (map && window.Tmapv2?.LatLng && typeof map.setCenter === "function") {
      map.setCenter(new window.Tmapv2.LatLng(lat, lng));
    }
  };

  const startExplore = () => {
    const cam = readLiveMapCenter();
    setFollow(false);
    setCenter(cam);
    setStationsAnchor({ lat: cam.lat, lng: cam.lng, source: "map" });
    setMobileSheetSnap("half");
  };

  const returnToMyLocation = () => {
    setStationsAnchor(null);
    setFollow(true);
    const cached = useLocationStore.getState().coords;
    if (cached) {
      panTo(cached.lat, cached.lng);
    }
    void locateOnce()
      .then((pos) => {
        panTo(pos.lat, pos.lng);
        setFollow(true);
      })
      .catch(() => {
        if (!useLocationStore.getState().coords) {
          setFollow(false);
        }
      });
  };

  const showOffer =
    !isMapExplore && (DEBUG_FORCE_SHOW_SEARCH_THIS_AREA || offerVisible);

  if (isMapExplore) {
    return (
      <div className="pointer-events-auto flex justify-center animate-fade-up">
        <button
          type="button"
          onClick={returnToMyLocation}
          aria-label="현위치로 돌아가기"
          className={chipClassName}
        >
          현위치로 돌아가기
        </button>
      </div>
    );
  }

  if (!showOffer) return null;

  return (
    <div className="pointer-events-auto flex justify-center animate-fade-up">
      <button
        type="button"
        onClick={startExplore}
        aria-label="주변 탐색하기"
        className={chipClassName}
      >
        주변 탐색하기
      </button>
    </div>
  );
}
