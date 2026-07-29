"use client";

import { useEffect, useMemo, useRef } from "react";
import type { Station } from "@/types/station";
import {
  availableCountForSlowFilter,
  chargerTotalForSlowFilter,
  filterStationsBySlowInclude,
} from "@/lib/chargerTypes";
import { useLocationStore } from "@/stores/locationStore";
import { useMapStore } from "@/stores/mapStore";

const MAP_ELEMENT_ID = "ev-tmap-map";
/** Tap must land within this many meters of a station (mobile hit slop). */
const HIT_MAX_M = 55;
const TAP_MAX_MOVE_PX = 14;
const TAP_MAX_MS = 500;

declare global {
  interface Window {
    Tmapv2: any;
  }
}

/** Colors aligned with StationList tones; easy to tweak later. */
function markerStyle(available: number | null): { fill: string } {
  if (available === null) return { fill: "#8b929e" };
  if (available === 0) return { fill: "#c47f17" };
  return { fill: "#1f9d63" };
}

function formatLabel(
  available: number | null,
  total: number | null | undefined,
): string {
  const a = available === null ? "—" : String(available);
  const t = total == null ? "—" : String(total);
  return `${a}/${t}`;
}

function buildCircleIconUrl(
  label: string,
  fill: string,
  selected: boolean,
): string {
  const size = 48;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";

  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 2;

  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.lineWidth = selected ? 3 : 2;
  ctx.strokeStyle = selected ? "#1a1d24" : "#ffffff";
  ctx.stroke();

  ctx.fillStyle = "#ffffff";
  ctx.font = 'bold 11px "Noto Sans KR", system-ui, sans-serif';
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(label, cx, cy + 0.5);

  return canvas.toDataURL("image/png");
}

function markerIcon(
  station: Station,
  selected: boolean,
  includeSlow: boolean,
) {
  const available = availableCountForSlowFilter(station, includeSlow);
  const total = chargerTotalForSlowFilter(station, includeSlow);
  const { fill } = markerStyle(available);
  const label = formatLabel(available, total);
  const url = buildCircleIconUrl(label, fill, selected);
  if (!url || !window.Tmapv2) return undefined;

  if (typeof window.Tmapv2.MarkerImage === "function") {
    return new window.Tmapv2.MarkerImage(
      url,
      new window.Tmapv2.Size(48, 48),
      new window.Tmapv2.Point(24, 24),
    );
  }
  return url;
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

function haversineMeters(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function nearestStation(
  stations: Station[],
  lat: number,
  lng: number,
  maxM: number,
): Station | null {
  let best: Station | null = null;
  let bestD = maxM;
  for (const s of stations) {
    const d = haversineMeters({ lat, lng }, s);
    if (d < bestD) {
      bestD = d;
      best = s;
    }
  }
  return best;
}

export default function StationMarkers() {
  const stations = useMapStore((s) => s.stations);
  const includeSlow = useMapStore((s) => s.includeSlow);
  const map = useMapStore((s) => s.map);
  const selectedId = useMapStore((s) => s.selectedId);

  const visible = useMemo(
    () => filterStationsBySlowInclude(stations, includeSlow),
    [stations, includeSlow],
  );

  const markersRef = useRef<Map<string, any>>(new Map());
  const stationsRef = useRef(visible);
  stationsRef.current = visible;

  // Create / refresh markers when map or filtered list changes (not on select).
  useEffect(() => {
    if (!map || !window.Tmapv2?.Marker || !window.Tmapv2?.LatLng) {
      return;
    }

    const selected = useMapStore.getState().selectedId;
    const slowOn = useMapStore.getState().includeSlow;
    const nextIds = new Set(visible.map((s) => s.stationId));

    markersRef.current.forEach((marker, id) => {
      if (!nextIds.has(id)) {
        marker.setMap(null);
        markersRef.current.delete(id);
      }
    });

    visible.forEach((station) => {
      const position = new window.Tmapv2.LatLng(station.lat, station.lng);
      const isSelected = station.stationId === selected;
      const icon = markerIcon(station, isSelected, slowOn);
      let marker = markersRef.current.get(station.stationId);

      if (!marker) {
        marker = new window.Tmapv2.Marker({
          position,
          map,
          title: station.name ?? "충전소",
          zIndex: 60,
          ...(icon ? { icon } : {}),
        });

        const onPick = () => {
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
        if (typeof marker.setPosition === "function") {
          marker.setPosition(position);
        }
        if (icon && typeof marker.setIcon === "function") {
          marker.setIcon(icon);
        }
      }
    });

    return () => {
      markersRef.current.forEach((marker) => {
        marker.setMap(null);
      });
      markersRef.current.clear();
    };
  }, [map, visible]);

  // Selection styling only — avoid full marker teardown on every tap.
  useEffect(() => {
    if (!map || !window.Tmapv2) return;
    stationsRef.current.forEach((station) => {
      const marker = markersRef.current.get(station.stationId);
      if (!marker || typeof marker.setIcon !== "function") return;
      const icon = markerIcon(
        station,
        station.stationId === selectedId,
        includeSlow,
      );
      if (icon) marker.setIcon(icon);
    });
  }, [map, selectedId, includeSlow]);

  /**
   * Mobile: radius Circle often swallows Marker taps (same issue as 시험주행).
   * Short tap on map DOM → nearest station within HIT_MAX_M.
   */
  useEffect(() => {
    if (!map) return;
    const el = document.getElementById(MAP_ELEMENT_ID);
    if (!el) return;

    let start: { x: number; y: number; t: number } | null = null;
    let moved = false;
    let multi = false;
    let activePointers = 0;

    const trySelectAt = (clientX: number, clientY: number) => {
      // 시험주행 탭 픽과 충돌 방지
      if (useLocationStore.getState().testMode) return;

      const ll = clientToLatLng(map, el, clientX, clientY);
      if (!ll) return;
      const hit = nearestStation(stationsRef.current, ll.lat, ll.lng, HIT_MAX_M);
      if (hit) {
        useMapStore.getState().selectStation(hit.stationId);
      }
    };

    const onPointerDown = (e: PointerEvent) => {
      if (e.pointerType === "mouse" && e.button !== 0) return;
      activePointers += 1;
      if (activePointers > 1) {
        multi = true;
        start = null;
        return;
      }
      multi = false;
      moved = false;
      start = { x: e.clientX, y: e.clientY, t: Date.now() };
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!start) return;
      const dx = e.clientX - start.x;
      const dy = e.clientY - start.y;
      if (dx * dx + dy * dy > TAP_MAX_MOVE_PX * TAP_MAX_MOVE_PX) {
        moved = true;
      }
    };

    const onPointerUp = (e: PointerEvent) => {
      const wasTap =
        !!start &&
        !multi &&
        !moved &&
        Date.now() - start.t <= TAP_MAX_MS;
      if (wasTap) {
        trySelectAt(e.clientX, e.clientY);
      }
      activePointers = Math.max(0, activePointers - 1);
      if (activePointers === 0) {
        start = null;
        moved = false;
        multi = false;
      }
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
