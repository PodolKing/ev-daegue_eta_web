import { sanitizeReturnUrl } from "@/lib/auth/returnUrl";

export type OAuthProvider = "kakao" | "google" | "naver";


/**
 * Start OAuth via full-page redirect (no popup).
 * Intended: BE `GET /api/v1/auth/{provider}/login?returnUrl=...` → provider → callback.
 */
export function startOAuthRedirect(
  provider: OAuthProvider,
  returnUrl: string,
): void {
  const safe = sanitizeReturnUrl(returnUrl);
  const apiBase =
    process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ??
    "http://localhost:8000";
  const q = new URLSearchParams({ returnUrl: safe });
  const target = `${apiBase}/api/v1/auth/${provider}/login?${q.toString()}`;
  // TODO: window.location.assign(target) after BE login_start is implemented
  void target;
}


/**
 * Called when user lands back on app after BE callback + cookie.
 * TODO: fetch `/api/v1/auth/me`, hydrate auth store; map restore is URL-driven.
 */
export async function handlePostLoginLanding(): Promise<void> {
  // TODO: GET me → setUser
}
