"use client";

import { useEffect, useRef } from "react";
import { useMapStore } from "@/stores/mapStore";
import { useRecommendStore } from "@/stores/recommendStore";

declare global {
  interface Window {
    Tmapv2: any;
  }
}

const _iconUrlCache = new Map<string, string>();

function scoreFill(score: number | null | undefined): string {
  if (score == null) return "#8b929e";
  if (score >= 80) return "#1f9d63";
  if (score >= 65) return "#2f6fed";
  if (score >= 50) return "#c47f17";
  return "#8b929e";
}

function buildRankIconUrl(
  rank: number,
  score: number | null | undefined,
  selected: boolean,
): string {
  const label = String(rank);
  const fill = scoreFill(score);
  const cacheKey = `r|${label}|${fill}|${selected ? 1 : 0}`;
  const cached = _iconUrlCache.get(cacheKey);
  if (cached) return cached;

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
  ctx.font = 'bold 14px "Noto Sans KR", system-ui, sans-serif';
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(label, cx, cy + 0.5);

  const url = canvas.toDataURL("image/png");
  _iconUrlCache.set(cacheKey, url);
  return url;
}

/**
 * AI 추천 결과만 지도에 표시 (일반 StationMarkers와 별도).
 * 길찾기 전 — 목록·마커로 고른 뒤 startDirections.
 */
export default function RecommendMarkers() {
  const map = useMapStore((s) => s.map);
  const active = useRecommendStore((s) => s.active);
  const items = useRecommendStore((s) => s.items);
  const selectedStatId = useRecommendStore((s) => s.selectedStatId);
  const setSelectedStatId = useRecommendStore((s) => s.setSelectedStatId);
  const markersRef = useRef<Map<string, any>>(new Map());

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

    if (!active || items.length === 0) {
      clearAll();
      return;
    }

    const keep = new Set(items.map((i) => i.statId));
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

    items.forEach((item, index) => {
      const rank = item.rank ?? index + 1;
      const selected = item.statId === selectedStatId;
      const url = buildRankIconUrl(rank, item.recommendationScore, selected);
      if (!url) return;

      let icon: unknown = url;
      if (typeof window.Tmapv2.MarkerImage === "function") {
        icon = new window.Tmapv2.MarkerImage(
          url,
          new window.Tmapv2.Size(48, 48),
          new window.Tmapv2.Point(24, 24),
        );
      }

      const existing = markersRef.current.get(item.statId);
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
        title: item.statNm ?? item.statId,
        icon,
      });

      const onClick = () => setSelectedStatId(item.statId);
      try {
        if (typeof marker.addListener === "function") {
          marker.addListener("click", onClick);
        } else if (window.Tmapv2.Event?.addListener) {
          window.Tmapv2.Event.addListener(marker, "click", onClick);
        }
      } catch {
        /* ignore */
      }

      markersRef.current.set(item.statId, marker);
    });
  }, [map, active, items, selectedStatId, setSelectedStatId]);

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
