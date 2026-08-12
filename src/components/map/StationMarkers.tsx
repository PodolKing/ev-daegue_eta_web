"use client";

import { useEffect, useMemo, useRef } from "react";
import type { Station } from "@/types/station";
import {
  availableCountForSlowFilter,
  chargerTotalForSlowFilter,
  filterStationsByCarPort,
  filterStationsBySlowInclude,
} from "@/lib/chargerTypes";
import { useLocationStore } from "@/stores/locationStore";
import { useMapStore } from "@/stores/mapStore";
import { useRecommendStore } from "@/stores/recommendStore";
import { useRouteStore } from "@/stores/routeStore";
import { useCarStore, effectiveChargingPort } from "@/stores/carStore";
import { ChargingPort } from "@/types/car";
import {
  nearestLatLngItem,
  stationHitMaxMForMap,
} from "@/lib/map/stationHit";
import {
  cascadeMarkerLayout,
  markerZForSelection,
  zoomFromMap,
} from "@/lib/map/stationMarkerCascade";
import { usePlaceCategoryStore } from "@/stores/placeCategoryStore";
import { stationCalloutMarkerIcon } from "@/lib/tmap/stationCalloutMarker";

const MAP_ELEMENT_ID = "ev-tmap-map";
/** 폴드·터치 미세 흔들림 허용 (기존 14는 취소가 잦음) */
const TAP_MAX_MOVE_PX = 28;

/** 자유주행 + 길찾기(loading/ready)일 때만 충전소 탭 차단. 탐색은 허용. */
function blockStationPick(): boolean {
  if (!useLocationStore.getState().testMode) return false;
  const status = useRouteStore.getState().status;
  return status === "loading" || status === "ready";
}

declare global {
  interface Window {
    Tmapv2: any;
  }
}

function markerIcon(
  station: Station,
  selected: boolean,
  includeSlow: boolean,
) {
  const available = availableCountForSlowFilter(station, includeSlow);
  const total = chargerTotalForSlowFilter(station, includeSlow);
  return stationCalloutMarkerIcon(available, total, selected);
}

function applyMarkerZ(marker: any, zIndex: number) {
  try {
    if (typeof marker.setZIndex === "function") marker.setZIndex(zIndex);
    else if (typeof marker.setOptions === "function") {
      marker.setOptions({ zIndex });
    }
  } catch {
    /* ignore */
  }
}

function readTmapLatLng(ll: unknown): { lat: number; lng: number } | null {
  if (!ll || typeof ll !== "object") return null;
  const o = ll as Record<string, unknown>;
  const rawLat =
    typeof o.lat === "function"
      ? (o.lat as () => number)()
      : typeof o.lat === "number"
        ? o.lat
        : typeof o._lat === "number"
          ? o._lat
          : null;
  const rawLng =
    typeof o.lng === "function"
      ? (o.lng as () => number)()
      : typeof o.lng === "number"
        ? o.lng
        : typeof o._lng === "number"
          ? o._lng
          : null;
  if (
    typeof rawLat !== "number" ||
    typeof rawLng !== "number" ||
    !Number.isFinite(rawLat) ||
    !Number.isFinite(rawLng)
  ) {
    return null;
  }
  return { lat: rawLat, lng: rawLng };
}

function clientToLatLng(
  map: any,
  el: HTMLElement,
  clientX: number,
  clientY: number,
): { lat: number; lng: number } | null {
  const rect = el.getBoundingClientRect();
  const x = clientX - rect.left;
  const y = clientY - rect.top;

  if (typeof map.screenToReal === "function") {
    try {
      if (window.Tmapv2?.Point) {
        const parsed = readTmapLatLng(
          map.screenToReal(new window.Tmapv2.Point(x, y)),
        );
        if (parsed) return parsed;
      }
      const parsed = readTmapLatLng(map.screenToReal(x, y));
      if (parsed) return parsed;
    } catch {
      /* fall through */
    }
  }

  try {
    const bounds =
      typeof map.getBounds === "function" ? map.getBounds() : null;
    const sw =
      bounds && typeof bounds.getSouthWest === "function"
        ? bounds.getSouthWest()
        : null;
    const ne =
      bounds && typeof bounds.getNorthEast === "function"
        ? bounds.getNorthEast()
        : null;
    const swLL = readTmapLatLng(sw);
    const neLL = readTmapLatLng(ne);
    if (swLL && neLL && rect.width > 0 && rect.height > 0) {
      const lng = swLL.lng + (neLL.lng - swLL.lng) * (x / rect.width);
      const lat = neLL.lat - (neLL.lat - swLL.lat) * (y / rect.height);
      if (Number.isFinite(lat) && Number.isFinite(lng)) {
        return { lat, lng };
      }
    }
  } catch {
    /* ignore */
  }
  return null;
}

export default function StationMarkers() {
  const stations = useMapStore((s) => s.stations);
  const includeSlow = useMapStore((s) => s.includeSlow);
  const map = useMapStore((s) => s.map);
  const selectedId = useMapStore((s) => s.selectedId);
  const recommendActive = useRecommendStore((s) => s.active);
  const filterByCarPort = useCarStore((s) => s.filterByCarPort);
  const primaryCar = useCarStore((s) => s.primaryCar);
  const port = effectiveChargingPort(primaryCar);

  // AI 추천 모드: 일반 반경 마커 숨김 → RecommendMarkers만
  const visible = useMemo(
    () =>
      recommendActive
        ? []
        : filterStationsByCarPort(
            filterStationsBySlowInclude(stations, includeSlow),
            port,
            filterByCarPort,
          ),
    [stations, includeSlow, port, filterByCarPort, recommendActive],
  );


  const markersRef = useRef<Map<string, any>>(new Map());
  /** Last cascade base zIndex per station (selection only bumps on top). */
  const baseZRef = useRef<Map<string, number>>(new Map());
  const stationsRef = useRef(visible);
  stationsRef.current = visible;
  const prevSelectedIdRef = useRef<string | null>(null);

  // Positions: list + zoom only. Selection must not reshuffle cascade slots.
  useEffect(() => {
    if (!map || !window.Tmapv2?.Marker || !window.Tmapv2?.LatLng) {
      return;
    }

    const syncPositions = () => {
      const list = stationsRef.current;
      const selected = useMapStore.getState().selectedId;
      const slowOn = useMapStore.getState().includeSlow;
      const z = zoomFromMap(map, useMapStore.getState().zoom);
      const layoutMap = cascadeMarkerLayout(list, z);
      const nextIds = new Set(list.map((s) => s.stationId));

      markersRef.current.forEach((marker, id) => {
        if (!nextIds.has(id)) {
          try {
            marker.setMap(null);
          } catch {
            /* ignore */
          }
          markersRef.current.delete(id);
          baseZRef.current.delete(id);
        }
      });

      list.forEach((station) => {
        const layout = layoutMap.get(station.stationId);
        const lat = layout?.lat ?? Number(station.lat);
        const lng = layout?.lng ?? Number(station.lng);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

        const baseZ = layout?.zIndex ?? 60;
        baseZRef.current.set(station.stationId, baseZ);
        const zIndex = markerZForSelection(
          baseZ,
          station.stationId === selected,
        );
        const position = new window.Tmapv2.LatLng(lat, lng);
        const isSelected = station.stationId === selected;
        const icon = markerIcon(station, isSelected, slowOn);
        let marker = markersRef.current.get(station.stationId);

        if (!marker) {
          marker = new window.Tmapv2.Marker({
            position,
            map,
            title: station.name ?? "충전소",
            zIndex,
            ...(icon ? { icon } : {}),
          });

          const onPick = () => {
            if (blockStationPick()) return;
            useMapStore.getState().selectStation(station.stationId);
          };

          if (window.Tmapv2.Event?.addListener) {
            window.Tmapv2.Event.addListener(marker, "click", onPick);
            try {
              window.Tmapv2.Event.addListener(marker, "touchend", onPick);
            } catch {
              /* some builds lack touchend */
            }
          } else if (typeof marker.addListener === "function") {
            marker.addListener("click", onPick);
          }

          markersRef.current.set(station.stationId, marker);
        } else {
          try {
            if (typeof marker.setPosition === "function") {
              marker.setPosition(position);
            }
          } catch {
            /* ignore */
          }
          if (icon && typeof marker.setIcon === "function") {
            marker.setIcon(icon);
          }
          applyMarkerZ(marker, zIndex);
        }
      });
    };

    syncPositions();

    let zoomListener: unknown = null;
    try {
      if (window.Tmapv2.Event?.addListener) {
        zoomListener = window.Tmapv2.Event.addListener(
          map,
          "zoom_changed",
          syncPositions,
        );
      }
    } catch {
      /* ignore */
    }

    return () => {
      try {
        if (
          zoomListener != null &&
          window.Tmapv2?.Event?.removeListener
        ) {
          window.Tmapv2.Event.removeListener(zoomListener);
        }
      } catch {
        /* ignore */
      }
      markersRef.current.forEach((marker) => {
        try {
          marker.setMap(null);
        } catch {
          /* ignore */
        }
      });
      markersRef.current.clear();
      baseZRef.current.clear();
    };
  }, [map, visible, includeSlow]);

  // Selection: icon stroke + zIndex only — do not move markers.
  useEffect(() => {
    if (!map || !window.Tmapv2) return;

    const prevId = prevSelectedIdRef.current;
    prevSelectedIdRef.current = selectedId;

    const ids = new Set<string>();
    if (prevId) ids.add(prevId);
    if (selectedId) ids.add(selectedId);

    ids.forEach((id) => {
      const station = stationsRef.current.find((s) => s.stationId === id);
      const marker = markersRef.current.get(id);
      if (!station || !marker) return;
      const selected = id === selectedId;
      if (typeof marker.setIcon === "function") {
        const icon = markerIcon(station, selected, includeSlow);
        if (icon) marker.setIcon(icon);
      }
      const baseZ = baseZRef.current.get(id) ?? 60;
      applyMarkerZ(marker, markerZForSelection(baseZ, selected));
    });
  }, [map, selectedId, includeSlow]);

  /**
   * Mobile: radius Circle often swallows Marker taps (same issue as 시험주행).
   * Short tap on map DOM → nearest station (줌 연동 hit m).
   * 자유주행+길찾기 중만 스킵 — 탐색 탭은 허용.
   */
  useEffect(() => {
    if (!map) return;
    const el = document.getElementById(MAP_ELEMENT_ID);
    if (!el) return;

    let start: { x: number; y: number; pending: boolean } | null = null;
    let activePointers = 0;

    const trySelectAt = (clientX: number, clientY: number) => {
      if (blockStationPick()) return;
      const ll = clientToLatLng(map, el, clientX, clientY);
      if (!ll) return;
      const maxM = stationHitMaxMForMap(map, ll.lat);
      const hit = nearestLatLngItem(
        stationsRef.current,
        ll.lat,
        ll.lng,
        maxM,
      );
      if (!hit) return;

      // 카테고리 POI가 더 가깝거나 동거리면 PlaceCategoryMarkers에 맡김
      const placeState = usePlaceCategoryStore.getState();
      if (placeState.active && placeState.items.length > 0) {
        const placeHit = nearestLatLngItem(
          placeState.items,
          ll.lat,
          ll.lng,
          maxM,
        );
        if (placeHit && placeHit.distanceM <= hit.distanceM) {
          return;
        }
      }

      useMapStore.getState().selectStation(hit.item.stationId);
    };

    const onPointerDown = (e: PointerEvent) => {
      if (e.pointerType === "mouse" && e.button !== 0) return;
      activePointers += 1;
      if (activePointers > 1) {
        // multi-touch (pinch) — cancel pending
        start = null;
        return;
      }
      start = { x: e.clientX, y: e.clientY, pending: true };
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!start || !start.pending) return;
      const dx = e.clientX - start.x;
      const dy = e.clientY - start.y;
      if (dx * dx + dy * dy > TAP_MAX_MOVE_PX * TAP_MAX_MOVE_PX) {
        // finger moved → not a tap, cancel
        start.pending = false;
      }
    };

    const onPointerUp = (e: PointerEvent) => {
      if (start?.pending) {
        // fire immediately on lift — no 300ms delay
        trySelectAt(e.clientX, e.clientY);
      }
      activePointers = Math.max(0, activePointers - 1);
      if (activePointers === 0) start = null;
    };

    const cap: AddEventListenerOptions = { capture: true, passive: true };
    el.addEventListener("pointerdown", onPointerDown, cap);
    el.addEventListener("pointermove", onPointerMove, cap);
    el.addEventListener("pointerup", onPointerUp, cap);
    el.addEventListener("pointercancel", onPointerUp, cap);

    return () => {
      el.removeEventListener("pointerdown", onPointerDown, true);
      el.removeEventListener("pointermove", onPointerMove, true);
      el.removeEventListener("pointerup", onPointerUp, true);
      el.removeEventListener("pointercancel", onPointerUp, true);
    };
  }, [map]);

  return null;
}
