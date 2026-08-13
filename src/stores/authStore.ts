import { create } from "zustand";
import { getApiBase } from "@/lib/api";

export type AuthUser = {
  id: string;
  nickname: string;
  socialProvider?: string;
} | null;

const ACCESS_TOKEN_KEY = "accessToken";

function readAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

function clearAccessToken(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(ACCESS_TOKEN_KEY);
}

type AuthState = {
  user: AuthUser;
  isAuthenticated: boolean;
  pointsBalance: number | null;
  status: "idle" | "loading" | "error";
  setUser: (user: AuthUser) => void;
  setPointsBalance: (n: number | null) => void;
  setStatus: (s: AuthState["status"]) => void;
  /** GET /api/v1/auth/me — localStorage Bearer로 hydrate */
  fetchMe: () => Promise<void>;
  /** 토큰 삭제 + store clear (+ optional BE logout) */
  logout: () => Promise<void>;
  clear: () => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  pointsBalance: null,
  status: "idle",
  setUser: (user) =>
    set({
      user,
      isAuthenticated: user != null,
    }),
  setPointsBalance: (pointsBalance) => set({ pointsBalance }),
  setStatus: (status) => set({ status }),
  fetchMe: async () => {
    const token = readAccessToken();
    if (!token) {
      set({
        user: null,
        isAuthenticated: false,
        pointsBalance: null,
        status: "idle",
      });
      return;
    }

    set({ status: "loading" });
    try {
      const res = await fetch(`${getApiBase()}/api/v1/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        clearAccessToken();
        set({
          user: null,
          isAuthenticated: false,
          pointsBalance: null,
          status: "idle",
        });
        return;
      }

      const data = (await res.json()) as {
        user?: {
          id: number | string;
          nickname: string;
          point?: number;
          socialProvider?: string | null;
        } | null;
      };

      if (!data.user) {
        clearAccessToken();
        set({
          user: null,
          isAuthenticated: false,
          pointsBalance: null,
          status: "idle",
        });
        return;
      }

      set({
        user: {
          id: String(data.user.id),
          nickname: data.user.nickname,
          socialProvider: data.user.socialProvider ?? undefined,
        },
        isAuthenticated: true,
        pointsBalance:
          typeof data.user.point === "number" ? data.user.point : null,
        status: "idle",
      });
    } catch {
      set({ status: "error" });
    }
  },
  logout: async () => {
    const token = readAccessToken();
    try {
      if (token) {
        await fetch(`${getApiBase()}/api/v1/auth/logout`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        });
      }
    } catch {
      // client token clear is enough
    }
    clearAccessToken();
    set({
      user: null,
      isAuthenticated: false,
      pointsBalance: null,
      status: "idle",
    });
    void import("@/stores/favoriteStore").then((m) => {
      m.useFavoriteStore.getState().clear();
    });
    void import("@/stores/carStore").then((m) => {
      m.useCarStore.getState().clear();
    });
  },
  clear: () => {
    clearAccessToken();
    set({
      user: null,
      isAuthenticated: false,
      pointsBalance: null,
      status: "idle",
    });
    void import("@/stores/favoriteStore").then((m) => {
      m.useFavoriteStore.getState().clear();
    });
    void import("@/stores/carStore").then((m) => {
      m.useCarStore.getState().clear();
    });
  },
}));
