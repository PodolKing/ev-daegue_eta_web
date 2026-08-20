import { create } from "zustand";
import { getApiBase } from "@/lib/api";

export type AuthUser = {
  id: string;
  nickname: string;
  role: string;
  address?: string | null;
  detailAddress?: string | null;
  provider?: string;
  userLat?: number | null;
  userLng?: number | null;
} | null;

export type UpdateProfileBody = {
  nickname?: string;
  address?: string | null;
  detailAddress?: string | null;
  userLat?: number | null;
  userLng?: number | null;
};

const ACCESS_TOKEN_KEY = "accessToken";

function readAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

function clearAccessToken(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(ACCESS_TOKEN_KEY);
}

type MeUserJson = {
  id: number | string;
  nickname: string;
  role?: string | null;
  point?: number;
  address?: string | null;
  detailAddress?: string | null;
  provider?: string | null;
  userLat?: number | null;
  userLng?: number | null;
};

function mapUser(u: MeUserJson): NonNullable<AuthUser> {
  return {
    id: String(u.id),
    nickname: u.nickname,
    role: typeof u.role === "string" ? u.role : "USER",
    address: u.address ?? null,
    detailAddress: u.detailAddress ?? null,
    provider: u.provider ?? undefined,
    userLat: typeof u.userLat === "number" ? u.userLat : null,
    userLng: typeof u.userLng === "number" ? u.userLng : null,
  };
}

function clearRelatedStores(): void {
  void import("@/stores/favoriteStore").then((m) => {
    m.useFavoriteStore.getState().clear();
  });
  void import("@/stores/carStore").then((m) => {
    m.useCarStore.getState().clear();
  });
  void import("@/stores/usageDraftStore").then((m) => {
    m.useUsageDraftStore.getState().clear();
  });
}

type AuthState = {
  user: AuthUser;
  isAuthenticated: boolean;
  pointsBalance: number | null;
  status: "idle" | "loading" | "error";
  setUser: (user: AuthUser) => void;
  setPointsBalance: (n: number | null) => void;
  setStatus: (s: AuthState["status"]) => void;
  fetchMe: () => Promise<void>;
  updateProfile: (body: UpdateProfileBody) => Promise<void>;
  withdraw: () => Promise<void>;
  logout: () => Promise<void>;
  clear: () => void;
};

export const useAuthStore = create<AuthState>((set, get) => ({
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

      const data = (await res.json()) as { user?: MeUserJson | null };

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
        user: mapUser(data.user),
        isAuthenticated: true,
        pointsBalance:
          typeof data.user.point === "number" ? data.user.point : null,
        status: "idle",
      });
    } catch {
      set({ status: "error" });
    }
  },
  updateProfile: async (body) => {
    const token = readAccessToken();
    if (!token) throw new Error("로그인이 필요합니다");

    const res = await fetch(`${getApiBase()}/api/v1/auth/me`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        nickname: body.nickname,
        address: body.address,
        detailAddress: body.detailAddress,
        userLat: body.userLat,
        userLng: body.userLng,
      }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      let detail = text;
      try {
        const parsed = JSON.parse(text) as { detail?: unknown };
        if (typeof parsed.detail === "string" && parsed.detail.trim()) {
          detail = parsed.detail.trim();
        }
      } catch {
        /* raw */
      }
      throw new Error(detail || `프로필 수정 실패 (${res.status})`);
    }

    const data = (await res.json()) as { user: MeUserJson };
    set({
      user: mapUser(data.user),
      isAuthenticated: true,
      pointsBalance:
        typeof data.user.point === "number"
          ? data.user.point
          : get().pointsBalance,
    });
  },
  withdraw: async () => {
    const token = readAccessToken();
    if (!token) throw new Error("로그인이 필요합니다");

    const res = await fetch(`${getApiBase()}/api/v1/auth/me`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      let detail = text;
      try {
        const parsed = JSON.parse(text) as { detail?: unknown };
        if (typeof parsed.detail === "string" && parsed.detail.trim()) {
          detail = parsed.detail.trim();
        }
      } catch {
        /* raw */
      }
      throw new Error(detail || `회원 탈퇴 실패 (${res.status})`);
    }

    clearAccessToken();
    set({
      user: null,
      isAuthenticated: false,
      pointsBalance: null,
      status: "idle",
    });
    clearRelatedStores();
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
    clearRelatedStores();
  },
  clear: () => {
    clearAccessToken();
    set({
      user: null,
      isAuthenticated: false,
      pointsBalance: null,
      status: "idle",
    });
    clearRelatedStores();
  },
}));