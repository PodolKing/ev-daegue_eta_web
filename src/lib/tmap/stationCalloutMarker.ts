/**
 * Station marker: tip-anchored number callout (가용/총).
 * Tip always down (body above); overlap is handled by display-position cascade.
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

/** Colors aligned with StationList / previous circle markers. */
export function stationCalloutFill(available: number | null): string {
  if (available === null) return "#8b929e";
  if (available === 0) return "#c47f17";
  return "#1f9d63";
}

function formatParts(
  available: number | null,
  total: number | null | undefined,
): { avail: string; total: string } {
  return {
    avail: available === null ? "—" : String(available),
    total: total == null ? "—" : String(total),
  };
}

/** Approx glyph width for Noto-ish bold digits at given px size. */
function estimateTextWidth(avail: string, total: string): number {
  const availW = avail.length * 9.2;
  const slashW = 6;
  const totalW = total.length * 7.2;
  return availW + slashW + totalW;
}

const _cache = new Map<string, unknown>();

/**
 * Rounded label + bottom tip. Anchor = tip tip (map lat/lng).
 * Available digit larger; `/total` slightly smaller for readability.
 */
export function stationCalloutMarkerIcon(
  available: number | null,
  total: number | null | undefined,
  selected = false,
) {
  const { avail, total: tot } = formatParts(available, total);
  const fill = stationCalloutFill(available);
  const key = `v3|${avail}|${tot}|${fill}|${selected ? 1 : 0}`;
  const cached = _cache.get(key);
  if (cached) return cached;

  const padX = 12;
  const bodyH = 28;
  const tipH = 10;
  const textW = estimateTextWidth(avail, tot);
  const width = Math.max(48, Math.ceil(padX * 2 + textW));
  const height = bodyH + tipH;
  const cx = width / 2;
  const r = 8;
  const stroke = selected ? "#1a1d24" : "#ffffff";
  const strokeW = selected ? 2.5 : 2;
  const tipHalf = 7;

  const path = [
    `M${r} 1`,
    `H${width - r}`,
    `A${r} ${r} 0 0 1 ${width - 1} ${r}`,
    `V${bodyH - r}`,
    `A${r} ${r} 0 0 1 ${width - r} ${bodyH}`,
    `H${cx + tipHalf}`,
    `L${cx} ${height - 1}`,
    `L${cx - tipHalf} ${bodyH}`,
    `H${r}`,
    `A${r} ${r} 0 0 1 1 ${bodyH - r}`,
    `V${r}`,
    `A${r} ${r} 0 0 1 ${r} 1`,
    `Z`,
  ].join(" ");

  const textY = bodyH / 2 + 1;
  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <path d="${path}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeW}" stroke-linejoin="round"/>
  <text x="${cx}" y="${textY}" text-anchor="middle" dominant-baseline="central"
    font-family="Noto Sans KR, system-ui, sans-serif" fill="#ffffff">
    <tspan font-size="14" font-weight="700">${avail}</tspan><tspan font-size="11" font-weight="600" fill-opacity="0.88">/${tot}</tspan>
  </text>
</svg>`.trim();

  const icon = asMarkerIcon(
    svgDataUrl(svg),
    width,
    height,
    Math.round(cx),
    height - 1,
  );
  _cache.set(key, icon);
  return icon;
}
