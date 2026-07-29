import { getApiBase } from "@/lib/api";
import { sanitizeReturnUrl } from "@/lib/auth/returnUrl";
import { useAuthStore } from "@/stores/authStore";

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
  const q = new URLSearchParams({ returnUrl: safe });
  const target = `${getApiBase()}/api/v1/auth/${provider}/login?${q.toString()}`;
  // TODO: window.location.assign(target) after BE login_start is implemented
  void target;
}


/**
 * Called when user lands on /map (local login redirect or OAuth return).
 * Hydrates auth from localStorage Bearer → GET /me.
 */
export async function handlePostLoginLanding(): Promise<void> {
  await useAuthStore.getState().fetchMe();
}
