/**
 * Start vs destination marker icons (shape + color), kept out of MapView.
 * 현위치 = blue GPS dot · 도착 = red pin.
 */

declare global {
  interface Window {
    Tmapv2: any;
  }
}

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

/** Blue circular “me” marker — center-anchored. */
export function myLocationMarkerIcon() {
  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
  <circle cx="16" cy="16" r="14" fill="#2F6BFF" fill-opacity="0.22"/>
  <circle cx="16" cy="16" r="8" fill="#2F6BFF" stroke="#ffffff" stroke-width="3"/>
</svg>`.trim();
  return asMarkerIcon(svgDataUrl(svg), 32, 32, 16, 16);
}

/** Red destination pin — tip-anchored. */
export function destinationMarkerIcon() {
  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="36" height="48" viewBox="0 0 36 48">
  <path d="M18 46C18 46 32 30.5 32 18.5C32 10.5 25.7 4 18 4C10.3 4 4 10.5 4 18.5C4 30.5 18 46 18 46Z" fill="#E11D48" stroke="#ffffff" stroke-width="2"/>
  <circle cx="18" cy="18" r="6" fill="#ffffff"/>
</svg>`.trim();
  return asMarkerIcon(svgDataUrl(svg), 36, 48, 18, 46);
}
