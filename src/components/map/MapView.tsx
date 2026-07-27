"use client";

import { useEffect, useRef, useState } from "react";
import { useMapStore } from "@/stores/mapStore";
import { useLocationStore } from "@/stores/locationStore";
import { RadiusControl } from "@/components/map/RadiusControl";
import { StationDetailCard } from "@/components/map/StationDetailCard";
import { MapSearchBar } from "@/components/map/MapSearchBar";
import { UnimplementedBadge } from "@/components/ui/Unimplemented";
import { FEATURES } from "@/lib/features";

declare global {
  interface Window {
    Tmapv2: any;
  }
}

const ZOOM_CONTROL_MIN_WIDTH = 700;

function canShowTmapZoomControl() {
  return (
    typeof window !== "undefined" &&
    window.innerWidth >= ZOOM_CONTROL_MIN_WIDTH
  );
}

/** jsv2 can expose a partial `Tmapv2` before LatLng/Map are constructors. */
function isTmapSdkReady(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.Tmapv2?.Map === "function" &&
    typeof window.Tmapv2?.LatLng === "function"
  );
}

function resizeTmap(map: any) {
  if (!map) return;

  if (typeof map.resize === "function") {
    map.resize();
  }
}

function setTmapZoomControl(map: any, visible: boolean) {
  if (!map) return;

  if (typeof map.setOptions === "function") {
    map.setOptions({
      zoomControl: visible,
    });
  }
}

const TMAP_MAP_KEY =
  process.env.NEXT_PUBLIC_TMAP_MAP_KEY?.trim() ?? "";

export function MapView() {
  const mapRef = useRef<HTMLDivElement>(null);

  const mapInstanceRef = useRef<any>(null);
  const scriptRef = useRef<HTMLScriptElement | null>(null);
  const myLocationMarkerRef = useRef<any>(null);
  /** When true, next center-effect skip — map already moved (drag / 현위치). */
  const skipCenterSyncRef = useRef(false);
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);

  const center = useMapStore((s) => s.center);
  const setCenter = useMapStore((s) => s.setCenter);
  const setZoom = useMapStore((s) => s.setZoom);
  const setMap = useMapStore((s) => s.setMap);

  const coords = useLocationStore((s) => s.coords);
  const locationError = useLocationStore((s) => s.error);
  const locationStatus = useLocationStore((s) => s.status);
  const setFollow = useLocationStore((s) => s.setFollow);
  const locateOnce = useLocationStore((s) => s.locateOnce);

  const panMapTo = (lat: number, lng: number, zoom?: number) => {
    const map = mapInstanceRef.current;
    if (map && window.Tmapv2?.LatLng) {
      map.setCenter(new window.Tmapv2.LatLng(lat, lng));
      if (zoom != null && typeof map.setZoom === "function") {
        map.setZoom(zoom);
      }
    }
    skipCenterSyncRef.current = true;
    setCenter({ lat, lng });
    if (zoom != null) setZoom(zoom);
  };


  const createMap = () => {
    if (!isTmapSdkReady() || !mapRef.current || mapInstanceRef.current) {
      return false;
    }

    try {
      const map = new window.Tmapv2.Map(mapRef.current, {
        center: new window.Tmapv2.LatLng(center.lat, center.lng),
        width: "100%",
        height: "100%",
        zoom: 15,
        zoomControl: canShowTmapZoomControl(),
        scrollwheel: true,
      });

      mapInstanceRef.current = map;
      setMap(map);
      setMapReady(true);
      setMapError(null);

      // Apply latest store center (createMap may run after bootstrap GPS)
      const latest = useMapStore.getState().center;
      map.setCenter(
        new window.Tmapv2.LatLng(latest.lat, latest.lng),
      );

      if (window.Tmapv2.Event) {
        window.Tmapv2.Event.addListener(map, "dragstart", () => {
          setFollow(false);
        });

        window.Tmapv2.Event.addListener(map, "dragend", () => {
          const c = map.getCenter();
          skipCenterSyncRef.current = true;
          setCenter({
            lat: c.lat(),
            lng: c.lng(),
          });
        });

        window.Tmapv2.Event.addListener(map, "zoom_changed", () => {
          setZoom(map.getZoom());
        });
      }

      requestAnimationFrame(() => {
        resizeTmap(map);
      });
      return true;
    } catch {
      setMapError(
        "지도를 초기화하지 못했습니다. TMAP 키·도메인 허용을 확인하세요.",
      );
      return false;
    }
  };

  /**
   * SDK 로딩 — official jsv2 URL requires appKey or tiles stay blank.
   */
  useEffect(() => {
    let cancelled = false;
    let pollId: number | null = null;
    let attempts = 0;

    const clearMap = () => {
      mapInstanceRef.current = null;
      setMap(null);
      setMapReady(false);
    };

    const tryCreate = () => {
      if (cancelled || mapInstanceRef.current) return;
      if (createMap()) return;
      attempts += 1;
      if (attempts > 40) {
        setMapError(
          "TMAP SDK가 준비되지 않았습니다. 키·네트워크를 확인한 뒤 새로고침하세요.",
        );
        return;
      }
      pollId = window.setTimeout(tryCreate, 100);
    };

    if (!TMAP_MAP_KEY) {
      setMapError(
        "NEXT_PUBLIC_TMAP_MAP_KEY가 없습니다. web/.env.local에 지도 SDK 키를 넣고 dev 서버를 재시작하세요.",
      );
      return clearMap;
    }

    setMapError(null);

    const sdkSrc = `https://apis.openapi.sk.com/tmap/jsv2?version=1&appKey=${encodeURIComponent(TMAP_MAP_KEY)}`;

    const existing = document.querySelector(
      'script[data-tmap-sdk="true"]',
    ) as HTMLScriptElement | null;

    // Drop legacy keyless / incomplete script so LatLng constructors load.
    if (
      existing &&
      (existing.src !== sdkSrc || !existing.src.includes("appKey="))
    ) {
      existing.remove();
      try {
        delete (window as { Tmapv2?: unknown }).Tmapv2;
      } catch {
        /* ignore */
      }
    }

    if (isTmapSdkReady()) {
      tryCreate();
      return () => {
        cancelled = true;
        if (pollId != null) window.clearTimeout(pollId);
        clearMap();
      };
    }

    const scriptEl = document.querySelector(
      'script[data-tmap-sdk="true"]',
    ) as HTMLScriptElement | null;

    if (scriptEl) {
      const onLoad = () => tryCreate();
      if (isTmapSdkReady()) {
        tryCreate();
      } else {
        scriptEl.addEventListener("load", onLoad);
        tryCreate();
      }
      return () => {
        cancelled = true;
        if (pollId != null) window.clearTimeout(pollId);
        scriptEl.removeEventListener("load", onLoad);
        clearMap();
      };
    }

    const script = document.createElement("script");
    script.dataset.tmapSdk = "true";
    script.src = sdkSrc;
    script.async = true;
    script.onload = () => tryCreate();
    script.onerror = () => {
      setMapError(
        "TMAP SDK 스크립트를 불러오지 못했습니다. 키·네트워크·도메인 허용을 확인하세요.",
      );
    };

    document.head.appendChild(script);
    scriptRef.current = script;

    return () => {
      cancelled = true;
      if (pollId != null) window.clearTimeout(pollId);
      script.onload = null;
      script.onerror = null;
      clearMap();
    };
  }, [setMap]);



  /**
   * Resize observer
   */
  useEffect(() => {
    const el = mapRef.current;

    if (!el) return;


    const sync = () => {
      resizeTmap(mapInstanceRef.current);

      setTmapZoomControl(
        mapInstanceRef.current,
        canShowTmapZoomControl(),
      );
    };


    const observer =
      new ResizeObserver(sync);


    observer.observe(el);

    window.addEventListener(
      "resize",
      sync,
    );


    return () => {
      observer.disconnect();

      window.removeEventListener(
        "resize",
        sync,
      );
    };

  }, []);



  /**
   * locationStore.coords → TMAP Marker (real map position, not screen-center overlay)
   */
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!mapReady || !map || !window.Tmapv2?.Marker || !window.Tmapv2?.LatLng) {
      return;
    }

    if (!coords) {
      if (myLocationMarkerRef.current) {
        myLocationMarkerRef.current.setMap(null);
        myLocationMarkerRef.current = null;
      }
      return;
    }

    const latLng = new window.Tmapv2.LatLng(coords.lat, coords.lng);

    if (!myLocationMarkerRef.current) {
      myLocationMarkerRef.current = new window.Tmapv2.Marker({
        position: latLng,
        map,
        title: "현위치",
      });
    } else {
      myLocationMarkerRef.current.setPosition(latLng);
    }
  }, [coords, mapReady]);

  /**
   * External center changes (search / bootstrap / URL) → TMAP camera.
   * Skips when we already moved the map (dragend / 현위치).
   */
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !window.Tmapv2?.LatLng) return;

    if (skipCenterSyncRef.current) {
      skipCenterSyncRef.current = false;
      return;
    }

    map.setCenter(
      new window.Tmapv2.LatLng(center.lat, center.lng),
    );
  }, [center]);

  /**
   * 현위치: every tap pans immediately (cached), then refreshes GPS.
   * Imperative map.setCenter — do not rely on React effect equality.
   */
  const handleMoveToMyLocation = () => {
    if (!FEATURES.moveToMyLocation) return;

    setFollow(true);

    const cached = useLocationStore.getState().coords;
    if (cached) {
      panMapTo(cached.lat, cached.lng, 16);
    }

    void locateOnce()
      .then((pos) => {
        panMapTo(pos.lat, pos.lng, 16);
        setFollow(true);
      })
      .catch(() => {
        if (!useLocationStore.getState().coords) {
          setFollow(false);
        }
      });
  };



  return (
    <div className="relative z-[15] h-full min-h-0 w-full overflow-hidden">
      {/* Trap TMAP's internal z-index so it cannot cover FABs/search */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        <div ref={mapRef} className="h-full w-full" />
      </div>

      {/* UI chrome — sibling stacking context above the map trap */}
      <div className="pointer-events-none absolute inset-0 z-10">
        {mapError ? (
          <div
            className="pointer-events-auto absolute inset-x-3 top-[4.75rem] rounded-[var(--radius-lg)] border border-[var(--border)] bg-white/95 px-3 py-2 text-[12px] text-[var(--danger)] shadow-[var(--shadow-sm)] md:left-4 md:right-auto md:max-w-[380px]"
            role="alert"
          >
            {mapError}
          </div>
        ) : null}

        <div
          className="
            pointer-events-none
            absolute
            inset-x-0
            top-[4.75rem]
            flex
            justify-start
            px-3
            pr-12
            min-[700px]:pr-16
            sm:left-4
            sm:right-auto
            sm:max-w-[380px]
            sm:px-0
          "
        >
          <MapSearchBar />
        </div>

        <div
          className="
            pointer-events-auto
            absolute
            bottom-[calc(42dvh+0.75rem)]
            left-3
            flex
            flex-col
            gap-2
            md:bottom-4
            md:left-4
          "
        >
          <div className="relative">
            <button
              type="button"
              onClick={handleMoveToMyLocation}
              disabled={
                !FEATURES.moveToMyLocation || locationStatus === "locating"
              }
              aria-label="현위치로 이동"
              title={locationError ?? "현위치로 이동"}
              className="
                flex
                h-10
                w-10
                items-center
                justify-center
                rounded-full
                border
                bg-white
                shadow
                touch-manipulation
                disabled:opacity-60
              "
            >
              {locationStatus === "locating" ? "…" : "◎"}
            </button>

            {FEATURES.moveToMyLocation && locationError && (
              <p
                className="
                  absolute
                  bottom-full
                  left-0
                  mb-2
                  w-max
                  max-w-[12rem]
                  rounded
                  border
                  bg-white
                  px-2
                  py-1
                  text-[11px]
                  text-red-600
                  shadow
                "
                role="status"
              >
                {locationError}
              </p>
            )}

            {!FEATURES.moveToMyLocation && (
              <span
                className="
                  absolute
                  -bottom-1
                  left-1/2
                  -translate-x-1/2
                  translate-y-full
                "
              >
                <UnimplementedBadge />
              </span>
            )}
          </div>

          <RadiusControl />
        </div>

        <div
          className="
            pointer-events-auto
            absolute
            bottom-[calc(42dvh+0.75rem)]
            right-3
            max-w-[calc(100%-6.5rem)]
            md:bottom-4
            md:right-4
            md:max-w-[calc(100%-1.5rem)]
          "
        >
          <StationDetailCard />
        </div>
      </div>
    </div>
  );
}