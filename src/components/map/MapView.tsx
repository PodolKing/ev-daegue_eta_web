"use client";

import { useEffect, useRef, useState } from "react";
import { useMapStore } from "@/stores/mapStore";
import { useLocationStore } from "@/stores/locationStore";
import { RadiusControl } from "@/components/map/RadiusControl";
import { StationDetailCard } from "@/components/map/StationDetailCard";
import { MapSearchBar } from "@/components/map/MapSearchBar";
import { UnimplementedBadge } from "@/components/ui/Unimplemented";
import { FEATURES } from "@/lib/features";
import { ensureTmapSdk, isTmapSdkReady } from "@/lib/tmap/loadSdk";

declare global {
  interface Window {
    Tmapv2: any;
  }
}

const ZOOM_CONTROL_MIN_WIDTH = 700;
const MAP_ELEMENT_ID = "ev-tmap-map";

function canShowTmapZoomControl() {
  return (
    typeof window !== "undefined" &&
    window.innerWidth >= ZOOM_CONTROL_MIN_WIDTH
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

  /**
   * SDK load (module singleton) → create map.
   * Strict Mode remount: loader promise is shared; we only recreate the Map instance.
   */
  useEffect(() => {
    let cancelled = false;

    const createMap = () => {
      if (cancelled || mapInstanceRef.current) return;
      if (!isTmapSdkReady() || !mapRef.current) return;

      try {
        // TMAP docs commonly use element id string
        mapRef.current.innerHTML = "";
        const map = new window.Tmapv2.Map(MAP_ELEMENT_ID, {
          center: new window.Tmapv2.LatLng(center.lat, center.lng),
          width: "100%",
          height: "100%",
          zoom: 15,
          zoomControl: canShowTmapZoomControl(),
          scrollwheel: true,
        });

        if (cancelled) {
          try {
            mapRef.current.innerHTML = "";
          } catch {
            /* ignore */
          }
          return;
        }

        mapInstanceRef.current = map;
        setMap(map);
        setMapReady(true);
        setMapError(null);

        const latest = useMapStore.getState().center;
        map.setCenter(new window.Tmapv2.LatLng(latest.lat, latest.lng));

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
      } catch (err) {
        mapInstanceRef.current = null;
        const detail = err instanceof Error ? err.message : String(err);
        setMapError(
          `지도를 초기화하지 못했습니다. TMAP 키·도메인 허용을 확인하세요. (${detail})`,
        );
      }
    };

    if (!TMAP_MAP_KEY) {
      setMapError(
        "NEXT_PUBLIC_TMAP_MAP_KEY가 없습니다. web/.env.local에 지도 SDK 키를 넣고 dev 서버를 재시작하세요.",
      );
      return;
    }

    setMapError(null);

    void ensureTmapSdk(TMAP_MAP_KEY)
      .then(() => {
        if (cancelled) return;
        createMap();
      })
      .catch((err: Error) => {
        if (!cancelled) {
          setMapError(err.message || "TMAP SDK를 불러오지 못했습니다.");
        }
      });

    return () => {
      cancelled = true;
      mapInstanceRef.current = null;
      myLocationMarkerRef.current = null;
      setMap(null);
      setMapReady(false);
    };
    // center only used for initial create; later moves go through store effects
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount-only map bootstrap
  }, [setMap, setCenter, setZoom, setFollow]);

  /** Tiles + camera after layout; restore zoom if resize/fit collapsed it */
  useEffect(() => {
    if (!mapReady) return;
    const map = mapInstanceRef.current;
    if (!map) return;

    const sync = () => {
      resizeTmap(map);
      const wanted = useMapStore.getState().zoom;
      if (
        typeof map.getZoom === "function" &&
        typeof map.setZoom === "function" &&
        wanted >= 11
      ) {
        const z = map.getZoom();
        if (typeof z === "number" && z < 11) {
          map.setZoom(wanted);
        }
      }
    };
    sync();
    const t1 = window.setTimeout(sync, 150);
    const t2 = window.setTimeout(sync, 500);
    const onVis = () => {
      if (document.visibilityState === "visible") sync();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [mapReady]);

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

    const observer = new ResizeObserver(sync);

    observer.observe(el);

    window.addEventListener("resize", sync);

    return () => {
      observer.disconnect();

      window.removeEventListener("resize", sync);
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

    map.setCenter(new window.Tmapv2.LatLng(center.lat, center.lng));
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
        <div id={MAP_ELEMENT_ID} ref={mapRef} className="h-full w-full" />
      </div>

      {/* UI chrome — sibling stacking context above the map trap */}
      <div className="pointer-events-none absolute inset-0 z-10">
        {mapError ? (
          <div
            className="pointer-events-auto absolute inset-x-3 top-[4.75rem] z-20 max-w-[min(100%,28rem)] rounded-[var(--radius-lg)] border border-[var(--border)] bg-white/95 px-3 py-2 text-[12px] text-[var(--danger)] shadow-[var(--shadow-sm)] md:left-4 md:right-auto"
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

        {/* flex-col-reverse: anchor at sheet top, grow upward so error banner stays visible */}
        <div
          className="
            pointer-events-auto
            absolute
            bottom-[calc(42dvh+0.75rem)]
            left-3
            flex
            flex-col-reverse
            items-start
            gap-2
            md:bottom-4
            md:left-4
          "
        >
          <RadiusControl />

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

          {FEATURES.moveToMyLocation && locationError ? (
            <div
              className="
                flex
                max-w-[min(calc(100vw-1.5rem),17.5rem)]
                items-start
                gap-2
                rounded-[var(--radius-lg)]
                border
                border-[var(--border)]
                bg-white/95
                px-3
                py-2
                shadow-[var(--shadow-md)]
                backdrop-blur-md
              "
              role="alert"
            >
              <p className="min-w-0 flex-1 text-[12px] leading-snug text-[var(--danger)]">
                {locationError}
              </p>
              <button
                type="button"
                onClick={() => useLocationStore.getState().setError(null)}
                className="shrink-0 text-[12px] text-[var(--text-muted)] touch-manipulation"
                aria-label="안내 닫기"
              >
                ✕
              </button>
            </div>
          ) : null}
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
