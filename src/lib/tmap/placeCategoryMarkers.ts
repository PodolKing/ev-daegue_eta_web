/**
 * Category POI marker icons (음식점·카페·편의점·주차장).
 * TMAP web SDK does not ship these — SVG data URLs (same idea as roleMarkers).
 */

declare global {
  interface Window {
    Tmapv2: any;
  }
}

import type { PlaceCategoryId } from "@/lib/map/placeCategories";

function asMarkerIcon(
  url: string,
  width: number,
  height: number,
  anchorX: number,
  anchorY: number,
) {
  if (!window.Tmapv2) return url;
  if (typeof window.Tmapv2.MarkerImage === "function") {
    return new window.Tmapv2.MarkerImage(
      url,
      new window.Tmapv2.Size(width, height),
      new window.Tmapv2.Point(anchorX, anchorY),
    );
  }
  return url;
}

function svgDataUrl(svg: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

/**
 * Glyph sits in the white disc (center ~18,17). Keep strokes bold for small size.
 */
const STYLE: Record<PlaceCategoryId, { fill: string; glyph: string }> = {
  // 포크 + 나이프
  restaurant: {
    fill: "#E11D48",
    glyph: `
<g fill="none" stroke="#E11D48" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
  <!-- fork tines -->
  <path d="M12.2 11.2v3.2M14 11.2v3.2M15.8 11.2v3.2"/>
  <path d="M12.2 14.4h3.6"/>
  <path d="M14 14.4v7.2"/>
  <!-- knife -->
  <path d="M20.2 11.2c1.8 0 3.2 1.2 3.2 3.2v1.2c0 1.1-.7 2-1.8 2.4L20.2 22.8"/>
  <path d="M20.2 11.2v11.6"/>
</g>`.trim(),
  },
  // 커피잔 + 손잡이 + 김
  cafe: {
    fill: "#A16207",
    glyph: `
<g fill="none" stroke="#A16207" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
  <path d="M12.5 14.5h8.2v5.2a2.4 2.4 0 0 1-2.4 2.4h-3.4a2.4 2.4 0 0 1-2.4-2.4z"/>
  <path d="M20.7 15.8h1.6a2 2 0 0 1 0 4h-1.6"/>
  <path d="M14.2 12.2c.4-.8.4-1.4 0-2.2M16.6 12.2c.4-.8.4-1.4 0-2.2M19 12.2c.4-.8.4-1.4 0-2.2"/>
</g>`.trim(),
  },
  // 편의점: 간판 + 문/창문
  convenience: {
    fill: "#15803D",
    glyph: `
<g fill="none" stroke="#15803D" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
  <!-- awning -->
  <path d="M11 13.2h14l-1.2 2.4H12.2z" fill="#15803D" fill-opacity="0.2"/>
  <path d="M11 13.2h14l-1.2 2.4H12.2z"/>
  <!-- body -->
  <rect x="12.2" y="15.6" width="11.6" height="7.2" rx="0.6"/>
  <!-- door -->
  <path d="M16.4 18.2v4.6"/>
  <path d="M16.4 18.2h3.2v4.6"/>
  <!-- window -->
  <rect x="20.6" y="17.8" width="2.4" height="2.2" rx="0.3"/>
</g>`.trim(),
  },
  // P
  parking: {
    fill: "#1D4ED8",
    glyph: `
<path fill="#1D4ED8" d="M14.4 11.6h4.4c2.35 0 3.9 1.45 3.9 3.55 0 2.1-1.55 3.55-3.9 3.55H16.2v3.5h-1.8zm1.8 1.55v3.5h2.5c1.2 0 2-.7 2-1.75s-.8-1.75-2-1.75z"/>`.trim(),
  },
};

const _cache = new Map<string, unknown>();

/** Tip-anchored pin icon for a place category. */
export function placeCategoryMarkerIcon(
  categoryId: PlaceCategoryId,
  selected = false,
) {
  // bust key if glyph set changes in same session (dev HMR)
  const key = `v2|${categoryId}|${selected ? 1 : 0}`;
  const cached = _cache.get(key);
  if (cached) return cached;

  const { fill, glyph } = STYLE[categoryId];
  const pin = `
<svg xmlns="http://www.w3.org/2000/svg" width="36" height="48" viewBox="0 0 36 48">
  <path d="M18 46C18 46 32 30.5 32 18.5C32 10.5 25.7 4 18 4C10.3 4 4 10.5 4 18.5C4 30.5 18 46 18 46Z" fill="${fill}" stroke="${selected ? "#1a1d24" : "#ffffff"}" stroke-width="${selected ? 3 : 2}"/>
  <circle cx="18" cy="17" r="9.5" fill="#ffffff"/>
  ${glyph}
</svg>`.trim();

  const icon = asMarkerIcon(svgDataUrl(pin), 36, 48, 18, 46);
  _cache.set(key, icon);
  return icon;
}
