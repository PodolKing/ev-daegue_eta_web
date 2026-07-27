/**
 * LOCKED / FROZEN (2026-07-27) — do not edit without user approval.
 * Spec: docs/important.md · Rule: .cursor/rules/tmap-sdk-lock.mdc
 *
 * Load order:
 * 1) topopentile (Map/LatLng — fast path)
 * 2) Official jsv2 + NEXT_PUBLIC_TMAP_MAP_KEY (if topopentile fails)
 */

declare global {
  interface Window {
    Tmapv2: any;
  }
}

const SCRIPT_ATTR = "data-tmap-sdk";

/** Known-good constructor bundle (used when official jsv2 leaves Map/LatLng undefined). */
const TOPOPENTILE_SRC =
  "https://topopentile1.tmap.co.kr/scriptSDKV2/tmapjs2.min.js?version=20231206";

/** jsv2: fail fast to fallback (stub often appears right after onload). */
const JSV2_READY_MS = 1200;
const JSV2_STUB_GRACE_MS = 350;

/** topopentile: longer — this is the working path when jsv2 is stub-only. */
const FALLBACK_READY_MS = 8000;

export function isTmapSdkReady(): boolean {
  if (typeof window === "undefined") return false;
  const T = window.Tmapv2;
  return !!(T && T.Map && T.LatLng);
}

/** Official jsv2 often leaves a shell object with no Map/LatLng (key/domain). */
function isTmapSdkStub(): boolean {
  if (typeof window === "undefined") return false;
  const T = window.Tmapv2;
  return !!(T && !T.Map && !T.LatLng);
}

export function diagnoseTmapSdk(): string {
  if (typeof window === "undefined") return "window 없음";
  const T = window.Tmapv2;
  if (!T) return "window.Tmapv2 없음 (스크립트 미로드·차단)";
  return `Tmapv2 OK, Map=${typeof T.Map}, LatLng=${typeof T.LatLng}`;
}

type LoaderState =
  | { status: "idle" }
  | { status: "loading"; promise: Promise<void> }
  | { status: "ready" }
  | { status: "error"; message: string };

let state: LoaderState = { status: "idle" };

function scriptEl(): HTMLScriptElement | null {
  return document.querySelector(`script[${SCRIPT_ATTR}="true"]`);
}

function wipeSdkArtifacts() {
  scriptEl()?.remove();
  try {
    delete (window as { Tmapv2?: unknown }).Tmapv2;
  } catch {
    /* ignore */
  }
}

function waitUntilReady(
  timeoutMs: number,
  opts?: { stubGraceMs?: number },
): Promise<void> {
  const started = Date.now();
  const stubGraceMs = opts?.stubGraceMs ?? 0;
  let stubSince: number | null = null;

  return new Promise((resolve, reject) => {
    const tick = () => {
      if (isTmapSdkReady()) {
        resolve();
        return;
      }

      if (stubGraceMs > 0 && isTmapSdkStub()) {
        if (stubSince == null) stubSince = Date.now();
        else if (Date.now() - stubSince >= stubGraceMs) {
          reject(new Error(`jsv2 stub (${diagnoseTmapSdk()})`));
          return;
        }
      } else {
        stubSince = null;
      }

      if (Date.now() - started > timeoutMs) {
        reject(new Error(diagnoseTmapSdk()));
        return;
      }
      window.setTimeout(tick, 40);
    };
    tick();
  });
}

function loadScriptTag(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const existing = scriptEl();
    if (existing) {
      if (existing.src === src && existing.dataset.tmapState === "loaded") {
        resolve();
        return;
      }
      if (existing.src === src && isTmapSdkReady()) {
        resolve();
        return;
      }
      // Different or broken tag — replace
      wipeSdkArtifacts();
    }

    const el = document.createElement("script");
    el.setAttribute(SCRIPT_ATTR, "true");
    el.src = src;
    el.async = true;
    el.onload = () => {
      el.dataset.tmapState = "loaded";
      resolve();
    };
    el.onerror = () => {
      el.dataset.tmapState = "error";
      reject(new Error(`스크립트 로드 실패: ${src.split("?")[0]}`));
    };
    document.head.appendChild(el);
  });
}

function officialJsv2Src(appKey: string): string {
  return `https://apis.openapi.sk.com/tmap/jsv2?version=1&appKey=${encodeURIComponent(appKey)}`;
}

/**
 * Ensures Tmapv2.Map / LatLng are usable. Safe to call repeatedly.
 *
 * Order: topopentile first (known constructors; fast). Official jsv2 is
 * attempted only if fallback fails — in this project jsv2 often returns a
 * stub without Map/LatLng (key/domain), so leading with it only delayed tiles.
 */
export function ensureTmapSdk(appKey: string): Promise<void> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("TMAP SDK는 브라우저에서만 로드됩니다."));
  }

  const key = appKey.trim();
  if (!key) {
    return Promise.reject(
      new Error(
        "NEXT_PUBLIC_TMAP_MAP_KEY가 없습니다. web/.env.local에 지도 SDK 키를 넣고 dev 서버를 재시작하세요.",
      ),
    );
  }

  if (isTmapSdkReady()) {
    state = { status: "ready" };
    return Promise.resolve();
  }

  if (state.status === "loading") {
    return state.promise;
  }

  if (state.status === "error") {
    wipeSdkArtifacts();
    state = { status: "idle" };
  }

  const promise = (async () => {
    // 1) topopentile first — Map/LatLng available without console domain
    try {
      await loadScriptTag(TOPOPENTILE_SRC);
      await waitUntilReady(FALLBACK_READY_MS);
      state = { status: "ready" };
      return;
    } catch {
      /* try official next */
    }

    // 2) Official jsv2 (when console domain/key allow full constructors)
    wipeSdkArtifacts();
    try {
      await loadScriptTag(officialJsv2Src(key));
      await waitUntilReady(JSV2_READY_MS, { stubGraceMs: JSV2_STUB_GRACE_MS });
      state = { status: "ready" };
      return;
    } catch (err) {
      const detail = err instanceof Error ? err.message : diagnoseTmapSdk();
      const message = [
        "TMAP SDK가 준비되지 않았습니다.",
        `(${detail})`,
        "topopentile·공식 jsv2 모두 실패.",
        "네트워크와 TMAP 콘솔 도메인(localhost)을 확인하세요.",
      ].join(" ");
      state = { status: "error", message };
      throw new Error(message);
    }
  })();

  state = { status: "loading", promise };
  return promise;
}
