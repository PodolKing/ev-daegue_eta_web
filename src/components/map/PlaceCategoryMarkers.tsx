"use client";

import { useEffect, useRef } from "react";
import { placeCategoryLabel } from "@/lib/map/placeCategories";
import type { TmapPlaceResult } from "@/lib/tmap/searchPlaces";
import { placeCategoryMarkerIcon } from "@/lib/tmap/placeCategoryMarkers";
import {
  nearestLatLngItem,
  stationHitMaxMForMap,
} from "@/lib/map/stationHit";
import { useMapStore } from "@/stores/mapStore";
import { useLocationStore } from "@/stores/locationStore";
import { usePlaceCategoryStore } from "@/stores/placeCategoryStore";
import { useRouteStore } from "@/stores/routeStore";

declare global {
  interface Window {
    Tmapv2: any;
  }
}

const MAP_ELEMENT_ID = "ev-tmap-map";
/** StationMarkers와 동일 — 폴드·터치 미세 흔들림 */
const TAP_MAX_MOVE_PX = 28;
const PLACE_SEARCH_ZOOM = 18;

function pickPlace(place: TmapPlaceResult) {
  const { categoryId, setSelectedId } = usePlaceCategoryStore.getState();
  setSelectedId(place.id);
  useLocationStore.getState().setFollow(false);
  useMapStore.getState().setSelectedId(null);
  useMapStore.getState().setMobileSheetSnap("peek");

  // around API는 middle/lowerBizName 미제공 → 활성 칩 라벨로 폴백
  const lower = place.lowerBizName?.trim() || null;
  const middle =
    place.middleBizName?.trim() ||
    (!lower ? placeCategoryLabel(categoryId) : null);

  useRouteStore.getState().setDestination({
    name: place.name,
    address: place.address,
    lat: place.lat,
    lng: place.lng,
    middleBizName: middle,
    lowerBizName: lower,
    parkFlag: place.parkFlag ?? null,
  });
  useMapStore.getState().setCenter({ lat: place.lat, lng: place.lng });
  useMapStore.getState().setZoom(PLACE_SEARCH_ZOOM);
  const map = useMapStore.getState().map;
  if (map && window.Tmapv2?.LatLng) {
    if (typeof map.setCenter === "function") {
      map.setCenter(new window.Tmapv2.LatLng(place.lat, place.lng));
    }
    if (typeof map.setZoom === "function") {
      map.setZoom(PLACE_SEARCH_ZOOM);
    }
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

/**
 * 카테고리(맛집·카페·편의점·주차장) around 결과 마커.
 * StationMarkers / RecommendMarkers와 별도. MapView는 조합만.
 */
export default function PlaceCategoryMarkers() {
  const map = useMapStore((s) => s.map);
  const active = usePlaceCategoryStore((s) => s.active);
  const categoryId = usePlaceCategoryStore((s) => s.categoryId);
  const items = usePlaceCategoryStore((s) => s.items);
  const selectedId = usePlaceCategoryStore((s) => s.selectedId);
  const markersRef = useRef<Map<string, any>>(new Map());
  const itemsRef = useRef(items);
  itemsRef.current = items;

  useEffect(() => {
    if (!map || !window.Tmapv2?.Marker || !window.Tmapv2?.LatLng) return;

    const clearAll = () => {
      markersRef.current.forEach((m) => {
        try {
          m.setMap(null);
        } catch {
          /* ignore */
        }
      });
      markersRef.current.clear();
    };

    if (!active || !categoryId || items.length === 0) {
      clearAll();
      return;
    }

    const keep = new Set(items.map((i) => i.id));
    markersRef.current.forEach((m, id) => {
      if (!keep.has(id)) {
        try {
          m.setMap(null);
        } catch {
          /* ignore */
        }
        markersRef.current.delete(id);
      }
    });

    items.forEach((item) => {
      const selected = item.id === selectedId;
      const icon = placeCategoryMarkerIcon(categoryId, selected);

      const existing = markersRef.current.get(item.id);
      if (existing) {
        try {
          existing.setIcon?.(icon);
          existing.setPosition?.(
            new window.Tmapv2.LatLng(item.lat, item.lng),
          );
        } catch {
          /* ignore */
        }
        return;
      }

      const marker = new window.Tmapv2.Marker({
        position: new window.Tmapv2.LatLng(item.lat, item.lng),
        map,
        title: item.name,
        icon,
      });

      const onClick = () => pickPlace(item);
      try {
        if (typeof marker.addListener === "function") {
          marker.addListener("click", onClick);
        } else if (window.Tmapv2.Event?.addListener) {
          window.Tmapv2.Event.addListener(marker, "click", onClick);
        }
      } catch {
        /* ignore */
      }

      markersRef.current.set(item.id, marker);
    });
  }, [map, active, categoryId, items, selectedId]);

  /**
   * Mobile: TMAP Marker click often fails (same as StationMarkers).
   * Short tap on map DOM → nearest category POI.
   * Station보다 가깝거나 동거리면 place 우선 (StationMarkers는 그때 skip).
   */
  useEffect(() => {
    if (!map || !active) return;
    const el = document.getElementById(MAP_ELEMENT_ID);
    if (!el) return;

    let start: { x: number; y: number; pending: boolean } | null = null;
    let activePointers = 0;

    const trySelectAt = (clientX: number, clientY: number) => {
      const list = itemsRef.current;
      if (!list.length) return;
      const ll = clientToLatLng(map, el, clientX, clientY);
      if (!ll) return;
      const maxM = stationHitMaxMForMap(map, ll.lat);
      const placeHit = nearestLatLngItem(list, ll.lat, ll.lng, maxM);
      if (!placeHit) return;

      const stations = useMapStore.getState().stations;
      const stationHit = nearestLatLngItem(stations, ll.lat, ll.lng, maxM);
      if (stationHit && stationHit.distanceM < placeHit.distanceM) {
        return;
      }
      pickPlace(placeHit.item);
    };

    const onPointerDown = (e: PointerEvent) => {
      if (e.pointerType === "mouse" && e.button !== 0) return;
      activePointers += 1;
      if (activePointers > 1) {
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
        start.pending = false;
      }
    };

    const onPointerUp = (e: PointerEvent) => {
      if (start?.pending) {
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
  }, [map, active]);

  useEffect(() => {
    return () => {
      markersRef.current.forEach((m) => {
        try {
          m.setMap(null);
        } catch {
          /* ignore */
        }
      });
      markersRef.current.clear();
    };
  }, []);

  return null;
}
