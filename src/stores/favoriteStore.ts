import { create } from "zustand";
import {
  FavoriteAuthError,
  fetchFavoriteList,
  toggleFavoriteApi,
  type FavoriteItem,
  type StationSearchItem,
} from "@/lib/api";

export type FavoritesTab = "list" | "add";

export type FavoriteAddDraft = {
  query: string;
  results: StationSearchItem[];
  selected: StationSearchItem | null;
  memo: string;
};

const EMPTY_ADD_DRAFT: FavoriteAddDraft = {
  query: "",
  results: [],
  selected: null,
  memo: "",
};

type FavoriteState = {
  items: FavoriteItem[];
  stationIds: Record<string, true>;
  status: "idle" | "loading" | "error";
  addTab: FavoritesTab;
  addDraft: FavoriteAddDraft;
  isFavorite: (stationId: string) => boolean;
  hydrate: () => Promise<void>;
  toggleFavorite: (stationId: string, memo?: string | null) => Promise<boolean>;
  setAddTab: (tab: FavoritesTab) => void;
  setAddDraft: (patch: Partial<FavoriteAddDraft>) => void;
  clearAddDraft: () => void;
  clear: () => void;
};

function idsFromItems(items: FavoriteItem[]): Record<string, true> {
  const stationIds: Record<string, true> = {};
  for (const item of items) {
    stationIds[item.stationId] = true;
  }
  return stationIds;
}

export const useFavoriteStore = create<FavoriteState>((set, get) => ({
  items: [],
  stationIds: {},
  status: "idle",
  addTab: "list",
  addDraft: EMPTY_ADD_DRAFT,
  isFavorite: (stationId) => Boolean(get().stationIds[stationId]),
  setAddTab: (tab) => set({ addTab: tab }),
  setAddDraft: (patch) =>
    set((s) => ({ addDraft: { ...s.addDraft, ...patch } })),
  clearAddDraft: () => set({ addDraft: EMPTY_ADD_DRAFT }),
  hydrate: async () => {
    set({ status: "loading" });
    try {
      const data = await fetchFavoriteList("recent");
      const items = data.items ?? [];
      set({ items, stationIds: idsFromItems(items), status: "idle" });
    } catch (e) {
      if (e instanceof FavoriteAuthError) {
        set({ items: [], stationIds: {}, status: "idle" });
        void import("@/stores/authStore").then((m) => {
          m.useAuthStore.getState().clear();
        });
        return;
      }
      set({ status: "error" });
    }
  },
  toggleFavorite: async (stationId, memo) => {
    try {
      const res = await toggleFavoriteApi({ stationId, memo });
      if (!res.processed) {
        window.alert(res.message);
        return false;
      }
      await get().hydrate();
      return true;
    } catch (e) {
      if (e instanceof FavoriteAuthError) {
        set({ items: [], stationIds: {}, status: "idle" });
        void import("@/stores/authStore").then((m) => {
          m.useAuthStore.getState().clear();
        });
        return false;
      }
      window.alert(
        e instanceof Error ? e.message : "즐겨찾기 처리에 실패했습니다",
      );
      return false;
    }
  },
  clear: () =>
    set({
      items: [],
      stationIds: {},
      status: "idle",
      addTab: "list",
      addDraft: EMPTY_ADD_DRAFT,
    }),
}));