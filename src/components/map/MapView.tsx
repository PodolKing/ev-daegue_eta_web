"use client";

import { useEffect, useRef } from "react";
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

export function MapView() {
  const mapRef = useRef<HTMLDivElement>(null);

  const mapInstanceRef = useRef<any>(null);
  const scriptRef = useRef<HTMLScriptElement | null>(null);
  /** When true, next center-effect skip — map already moved (drag / 현위치). */
  const skipCenterSyncRef = useRef(false);

  const center = useMapStore((s) => s.center);
  const setCenter = useMapStore((s) => s.setCenter);
  const setZoom = useMapStore((s) => s.setZoom);

  const stations = useMapStore((s) => s.stations);
  const selectedId = useMapStore((s) => s.selectedId);
  const setSelectedId = useMapStore((s) => s.setSelectedId);

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
   * TMAP 생성
   */
  const createMap = () => {
    if (
      !window.Tmapv2 ||
      !mapRef.current ||
      mapInstanceRef.current
    ) {
      return;
    }


    const map = new window.Tmapv2.Map(
      mapRef.current,
      {
        center: new window.Tmapv2.LatLng(
          center.lat,
          center.lng,
        ),
        width: "100%",
        height: "100%",
        zoom: 15,
        zoomControl: canShowTmapZoomControl(),
        scrollwheel: true,
      },
    );


    mapInstanceRef.current = map;

    // Apply latest store center (createMap may run after bootstrap GPS)
    const latest = useMapStore.getState().center;
    map.setCenter(
      new window.Tmapv2.LatLng(latest.lat, latest.lng),
    );


    /**
     * 지도 이동 이벤트
     */
    if (window.Tmapv2.Event) {
      window.Tmapv2.Event.addListener(
        map,
        "dragstart",
        () => {
          setFollow(false);
        },
      );

      window.Tmapv2.Event.addListener(
        map,
        "dragend",
        () => {
          const c = map.getCenter();
          skipCenterSyncRef.current = true;
          setCenter({
            lat: c.lat(),
            lng: c.lng(),
          });
        },
      );


      window.Tmapv2.Event.addListener(
        map,
        "zoom_changed",
        () => {
          setZoom(map.getZoom());
        },
      );
    }


    requestAnimationFrame(() => {
      resizeTmap(map);
    });
  };


  /**
   * SDK 로딩
   */
  useEffect(() => {
    if (window.Tmapv2?.Map) {
      createMap();
      return;
    }


    const existing =
      document.querySelector(
        'script[data-tmap-sdk="true"]',
      );


    if (existing) {
      existing.addEventListener(
        "load",
        createMap,
      );

      return;
    }


    const script =
      document.createElement("script");


    script.dataset.tmapSdk = "true";

    script.src =
      "https://topopentile1.tmap.co.kr/scriptSDKV2/tmapjs2.min.js?version=20231206";

    script.async = true;


    script.onload = () => {
      setTimeout(() => {
        createMap();
      }, 100);
    };


    document.head.appendChild(script);

    scriptRef.current = script;


    return () => {
      script.removeEventListener(
        "load",
        createMap,
      );
    };
  }, []);



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
    <div className="relative h-full min-h-0 w-full overflow-hidden">

      <div
        ref={mapRef}
        className="absolute inset-0"
      />


      {/* 임시 station overlay */}
      <div className="pointer-events-none absolute inset-0 z-[5]">

        {stations.map((station) => {

          const active =
            station.stationId === selectedId;


          return (
            <button
              key={station.stationId}
              type="button"
              onClick={() =>
                setSelectedId(
                  station.stationId,
                )
              }
              className={[
                "pointer-events-auto",
                "rounded-full px-3 py-2 text-sm font-bold shadow",
                active
                  ? "bg-blue-500 text-white"
                  : "bg-green-500 text-white",
              ].join(" ")}
            >
              {station.availableCount ?? "-"}
            </button>
          );

        })}


        {coords && (
          <div
            className="
              absolute
              left-1/2
              top-1/2
              h-4
              w-4
              -translate-x-1/2
              -translate-y-1/2
              rounded-full
              border-2
              border-white
              bg-blue-500
            "
          />
        )}

      </div>



      {/* 검색 */}
      <div
        className="
          pointer-events-none
          absolute
          inset-x-0
          top-[3.75rem]
          z-[28]
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



      {/* 좌측 버튼 */}
      <div
        className="
          absolute
          bottom-[calc(42%+0.75rem)]
          left-3
          z-20
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
            disabled={!FEATURES.moveToMyLocation}
            aria-label="현위치로 이동"
            aria-busy={locationStatus === "locating"}
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



      {/* 상세 카드 */}
      <div
        className="
          absolute
          bottom-4
          right-4
          z-20
          max-w-[calc(100%-1.5rem)]
        "
      >
        <StationDetailCard />
      </div>


    </div>
  );
}