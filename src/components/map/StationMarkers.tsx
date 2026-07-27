"use client";

import { useEffect, useRef } from "react";
import type { Station } from "@/types/station";
import { useMapStore } from "@/stores/mapStore";

/** Colors aligned with StationList tones; easy to tweak later. */
function markerStyle(available: number | null): { fill: string } {
  if (available === null) return { fill: "#8b929e" }; // muted — 미관측
  if (available === 0) return { fill: "#c47f17" }; // warning — 대기 0
  return { fill: "#1f9d63" }; // success — 가용
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
  const size = 44;
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
  ctx.font = "bold 11px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(label, cx, cy + 0.5);

  return canvas.toDataURL("image/png");
}

function markerIcon(station: Station, selected: boolean) {
  const { fill } = markerStyle(station.availableCount);
  const label = formatLabel(station.availableCount, station.chargerTotal);
  const url = buildCircleIconUrl(label, fill, selected);
  if (!url || !window.Tmapv2) return undefined;

  if (typeof window.Tmapv2.MarkerImage === "function") {
    return new window.Tmapv2.MarkerImage(
      url,
      new window.Tmapv2.Size(44, 44),
      new window.Tmapv2.Point(22, 22),
    );
  }
  return url;
}

export default function StationMarkers() {
  const stations = useMapStore((s) => s.stations);
  const map = useMapStore((s) => s.map);
  const selectedId = useMapStore((s) => s.selectedId);

  const markersRef = useRef<any[]>([]);

  useEffect(() => {
    if (!map || !window.Tmapv2?.Marker || !window.Tmapv2?.LatLng) {
      return;
    }

    markersRef.current.forEach((marker) => {
      marker.setMap(null);
    });
    markersRef.current = [];

    stations.forEach((station) => {
      const position = new window.Tmapv2.LatLng(station.lat, station.lng);
      const selected = station.stationId === selectedId;
      const icon = markerIcon(station, selected);

      const marker = new window.Tmapv2.Marker({
        position,
        map,
        title: station.name ?? "충전소",
        ...(icon ? { icon } : {}),
      });

      if (window.Tmapv2.Event?.addListener) {
        window.Tmapv2.Event.addListener(marker, "click", () => {
          useMapStore.getState().setSelectedId(station.stationId);
        });
      } else if (typeof marker.addListener === "function") {
        marker.addListener("click", () => {
          useMapStore.getState().setSelectedId(station.stationId);
        });
      }

      markersRef.current.push(marker);
    });

    return () => {
      markersRef.current.forEach((marker) => {
        marker.setMap(null);
      });
      markersRef.current = [];
    };
  }, [map, stations, selectedId]);

  return null;
}
