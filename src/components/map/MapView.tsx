"use client";

import { useEffect, useRef } from "react";
import { useMapStore } from "@/stores/mapStore";
import { RadiusControl } from "@/components/map/RadiusControl";
import { StationDetailCard } from "@/components/map/StationDetailCard";
import { MapSearchBar } from "@/components/map/MapSearchBar";

declare global {
  interface Window {
    Tmapv2: any;
  }
}

export function MapView() {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const scriptLoadedRef = useRef(false);

  const center = useMapStore((s) => s.center);
  const stations = useMapStore((s) => s.stations);
  const selectedId = useMapStore((s) => s.selectedId);
  const setSelectedId = useMapStore((s) => s.setSelectedId);
  const userLocation = useMapStore((s) => s.userLocation);

  const createMap = () => {
    if (!window.Tmapv2) {
      console.error("TMAP SDK 없음");
      return;
    }

    if (!mapRef.current) {
      return;
    }

    if (mapInstanceRef.current) {
      return;
    }

    console.log("TMAP 객체", window.Tmapv2);

    mapInstanceRef.current = new window.Tmapv2.Map(
      mapRef.current,
      {
        center: new window.Tmapv2.LatLng(
          center.lat,
          center.lng
        ),
        width: "100%",
        height: "100%",
        zoom: 15,
      }
    );

    console.log("지도 생성 완료");
  };


  useEffect(() => {
    if (scriptLoadedRef.current) {
      return;
    }

    scriptLoadedRef.current = true;


    // 이미 로드되어 있으면 바로 실행
    if (window.Tmapv2?.Map) {
      createMap();
      return;
    }


    const script = document.createElement("script");

    script.src =
      "https://topopentile1.tmap.co.kr/scriptSDKV2/tmapjs2.min.js?version=20231206";

    script.async = true;


    script.onload = () => {
      console.log("TMAP SDK 로드 성공");

      setTimeout(() => {
        createMap();
      }, 100);
    };


    script.onerror = (e) => {
      console.error(
        "TMAP SDK 로드 실패",
        e
      );
    };


    document.head.appendChild(script);


    return () => {
      // 개발 중에는 제거하지 않는 게 좋음
      // React StrictMode 재실행 방지
    };

  }, []);



  // 중심 이동
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    if (!window.Tmapv2?.LatLng) return;


    mapInstanceRef.current.setCenter(
      new window.Tmapv2.LatLng(
        center.lat,
        center.lng
      )
    );

  }, [center]);

  /** 현위치로 지도 이동 — 기능은 직접 구현 */
  const handleMoveToMyLocation = () => {
    // TODO: geolocation → setUserLocation / setCenter → mapInstanceRef.setCenter(...)
  };

  return (
    <div className="relative h-full min-h-0 w-full overflow-hidden">

      <div
        ref={mapRef}
        className="absolute inset-0"
      />


      <div className="absolute inset-0 z-[5] pointer-events-none">

        {stations.map((s) => {

          const active =
            s.stationId === selectedId;


          return (
            <button
              key={s.stationId}
              type="button"
              onClick={() =>
                setSelectedId(s.stationId)
              }
              className={[
                "pointer-events-auto",
                active
                  ? "bg-blue-500 text-white"
                  : "bg-green-500 text-white",
              ].join(" ")}
            >
              {s.availableCount ?? "-"}
            </button>
          );

        })}


        {userLocation && (
          <div
            className="
              absolute
              left-1/2
              top-1/2
              h-4
              w-4
              rounded-full
              bg-blue-500
              border-2
              border-white
            "
          />
        )}

      </div>

      {/* TopBar 아래 · 모바일 풀폭 / sm+ 고정 폭 · 하단 시트와 겹치지 않게 상단 배치 */}
      <div className="pointer-events-none absolute inset-x-0 top-[3.75rem] z-25 px-3 sm:top-[4.25rem] sm:left-4 sm:right-auto sm:px-0 md:top-[4.5rem]">
        <MapSearchBar />
      </div>

      {/* 모바일: 하단 충전소 시트 위에 오도록 bottom 여백 */}
      <div className="absolute bottom-[calc(42%+0.75rem)] left-3 z-20 flex flex-col items-start gap-2 md:bottom-4 md:left-4">
        <button
          type="button"
          onClick={handleMoveToMyLocation}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--border)] bg-white text-[var(--text)] shadow-[var(--shadow-sm)] transition hover:bg-[var(--surface-muted)]"
          aria-label="현위치로 이동"
          title="현위치로 이동"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
            <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8" />
            <path
              d="M12 3v2.5M12 18.5V21M3 12h2.5M18.5 12H21"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
            <circle cx="12" cy="12" r="7" stroke="currentColor" strokeWidth="1.8" />
          </svg>
        </button>
        <RadiusControl />
      </div>


      <div className="absolute bottom-4 right-4 z-20">
        <StationDetailCard />
      </div>

    </div>
  );
}