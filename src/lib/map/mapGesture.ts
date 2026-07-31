/**
 * Sync flag: user is dragging/clicking the TMAP canvas.
 * React setCenter / Circle recreate / GPS chase must not run during this,
 * or the map rubber-bands under the cursor.
 */

let active = false;
let releaseTimer: ReturnType<typeof setTimeout> | null = null;

/** Call on pointerdown (capture) on #ev-tmap-map. */
export function beginMapGesture(): void {
  if (releaseTimer != null) {
    clearTimeout(releaseTimer);
    releaseTimer = null;
  }
  active = true;
}

/**
 * Call on pointerup/cancel. Keeps the lock briefly so late
 * GPS / dragend / React effects cannot fight pan inertia.
 */
export function endMapGesture(holdMs = 450): void {
  if (releaseTimer != null) clearTimeout(releaseTimer);
  releaseTimer = setTimeout(() => {
    active = false;
    releaseTimer = null;
  }, holdMs);
}

export function isMapGestureActive(): boolean {
  return active;
}
