import { create } from "zustand";

export type AuthUser = {
  id: string;
  nickname: string;
  socialProvider?: string;
} | null;

type AuthState = {
  user: AuthUser;
  isAuthenticated: boolean;
  pointsBalance: number | null;
  status: "idle" | "loading" | "error";
  setUser: (user: AuthUser) => void;
  setPointsBalance: (n: number | null) => void;
  setStatus: (s: AuthState["status"]) => void;
  /** TODO: GET /api/v1/auth/me and hydrate store */
  fetchMe: () => Promise<void>;
  /** TODO: POST /api/v1/auth/logout then clear store */
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
    // TODO: call BE /api/v1/auth/me (credentials include), setUser
    set({ status: "idle" });
  },
  logout: async () => {
    // TODO: call BE /api/v1/auth/logout, then clear
    set({ user: null, isAuthenticated: false, pointsBalance: null });
  },
  clear: () =>
    set({
      user: null,
      isAuthenticated: false,
      pointsBalance: null,
      status: "idle",
    }),
}));
