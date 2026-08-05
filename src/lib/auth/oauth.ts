import { getApiBase } from "@/lib/api";
import { sanitizeReturnUrl } from "@/lib/auth/returnUrl";
import { useAuthStore } from "@/stores/authStore";

export type OAuthProvider = "kakao" | "google" | "naver";

const ACCESS_TOKEN_KEY = "accessToken";

/**
 * Start OAuth via full-page redirect (no popup).
 * BE: GET /api/v1/auth/{provider}/login → provider → callback → FE + #accessToken=
 * Auth is our FastAPI JWT (not Supabase Auth) so DB can move (Supabase → AWS) later.
 */
export function startOAuthRedirect(
  provider: OAuthProvider,
  returnUrl: string,
): void {
  const safe = sanitizeReturnUrl(returnUrl);
  const q = new URLSearchParams({ returnUrl: safe });
  const target = `${getApiBase()}/api/v1/auth/${provider}/login?${q.toString()}`;
  window.location.assign(target);
}

/**
 * OAuth callback lands on FE with `#accessToken=…` (cross-origin safe).
 * Query `?accessToken=` also accepted. Strip token from the address bar after save.
 */
export function consumeOAuthAccessTokenFromUrl(): boolean {
  if (typeof window === "undefined") return false;

  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const queryParams = new URLSearchParams(window.location.search);
  const token =
    hashParams.get("accessToken")?.trim() ||
    queryParams.get("accessToken")?.trim() ||
    "";

  if (!token) return false;

  localStorage.setItem(ACCESS_TOKEN_KEY, token);

  const url = new URL(window.location.href);
  url.searchParams.delete("accessToken");
  const nextHash = new URLSearchParams(url.hash.replace(/^#/, ""));
  nextHash.delete("accessToken");
  const hashRest = nextHash.toString();
  url.hash = hashRest ? `#${hashRest}` : "";
  window.history.replaceState(
    {},
    "",
    `${url.pathname}${url.search}${url.hash}`,
  );
  return true;
}

/**
 * Called when user lands on /map (local login redirect or OAuth return).
 * Hydrates auth from localStorage Bearer → GET /me.
 */
export async function handlePostLoginLanding(): Promise<void> {
  consumeOAuthAccessTokenFromUrl();
  await useAuthStore.getState().fetchMe();
}
