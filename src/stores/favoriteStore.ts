import { create } from "zustand";
import {
  FavoriteAuthError,
  fetchFavoriteList,
  toggleFavoriteApi,
  updateFavoriteMemoApi,
  type FavoriteItem,
  type FavoriteSort,
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

export type FavoriteNotice = {
  title: string;
  description: string | null;
};

const MAX_FAVORITES = 10;

const LIMIT_NOTICE: FavoriteNotice = {
  title: "즐겨찾기는 최대 10곳입니다",
  description: "목록에서 하나를 해제한 뒤 다시 추가해 주세요.",
};

type FavoriteState = {
  items: FavoriteItem[];
  stationIds: Record<string, true>;
  status: "idle" | "loading" | "error";
  addTab: FavoritesTab;
  addDraft: FavoriteAddDraft;
  notice: FavoriteNotice | null;
  /** stationId → 원하는 찜 여부. hydrate가 덮지 않게. */
  pending: Record<string, boolean>;
  listSort: FavoriteSort;
  isFavorite: (stationId: string) => boolean;
  toggleListSort: () => void;
  hydrate: () => Promise<void>;
  toggleFavorite: (stationId: string, memo?: string | null) => Promise<boolean>;
  updateMemo: (stationId: string, memo: string | null) => Promise<boolean>;
  setAddTab: (tab: FavoritesTab) => void;
  setAddDraft: (patch: Partial<FavoriteAddDraft>) => void;
  clearAddDraft: () => void;
  clearNotice: () => void;
  clear: () => void;
};

function idsFromItems(items: FavoriteItem[]): Record<string, true> {
  const stationIds: Record<string, true> = {};
  for (const item of items) {
    stationIds[item.stationId] = true;
  }
  return stationIds;
}

function withPending(
  items: FavoriteItem[],
  pending: Record<string, boolean>,
): Record<string, true> {
  const stationIds = idsFromItems(items);
  for (const [id, want] of Object.entries(pending)) {
    if (want) stationIds[id] = true;
    else delete stationIds[id];
  }
  return stationIds;
}

export const useFavoriteStore = create<FavoriteState>((set, get) => ({
  items: [],
  stationIds: {},
  status: "idle",
  addTab: "list",
  addDraft: EMPTY_ADD_DRAFT,
  notice: null,
  pending: {},
  listSort: "recent",
  isFavorite: (stationId) => Boolean(get().stationIds[stationId]),
  toggleListSort: () => {
    const listSort = get().listSort === "recent" ? "name" : "recent";
    set({ listSort });
    void get().hydrate();
  },
  setAddTab: (tab) => set({ addTab: tab }),
  clearNotice: () => set({ notice: null }),
  setAddDraft: (patch) =>
    set((s) => ({ addDraft: { ...s.addDraft, ...patch } })),
  clearAddDraft: () => set({ addDraft: EMPTY_ADD_DRAFT }),
  hydrate: async () => {
    if (get().items.length === 0) set({ status: "loading" });
    try {
      const data = await fetchFavoriteList(get().listSort);
      const items = data.items ?? [];
      const pending = get().pending;
      set({
        items,
        stationIds: withPending(items, pending),
        status: "idle",
      });
    } catch (e) {
      if (e instanceof FavoriteAuthError) {
        set({ items: [], stationIds: {}, pending: {}, status: "idle" });
        void import("@/stores/authStore").then((m) => {
          m.useAuthStore.getState().clear();
        });
        return;
      }
      set({ status: "error" });
    }
  },
  toggleFavorite: async (stationId, memo) => {
    const prev = get();
    if (stationId in prev.pending) return false;

    const was = Boolean(prev.stationIds[stationId]);
    const next = !was;
    if (next && Object.keys(prev.stationIds).length >= MAX_FAVORITES) {
      set({ notice: LIMIT_NOTICE });
      return false;
    }

    const pending = { ...prev.pending, [stationId]: next };
    const stationIds = { ...prev.stationIds };
    if (next) stationIds[stationId] = true;
    else delete stationIds[stationId];
    const items = next
      ? prev.items
      : prev.items.filter((item) => item.stationId !== stationId);
    set({ pending, stationIds, items });

    const revert = (notice: FavoriteNotice | null) => {
      const p = { ...get().pending };
      delete p[stationId];
      set({
        pending: p,
        stationIds: prev.stationIds,
        items: prev.items,
        notice,
      });
    };

    try {
      const res = await toggleFavoriteApi({ stationId, memo });
      if (!res.processed) {
        revert(
          res.code === "FAVORITE_LIMIT_REACHED"
            ? LIMIT_NOTICE
            : {
                title: res.message || "즐겨찾기를 저장할 수 없습니다",
                description: null,
              },
        );
        return false;
      }
      const p = { ...get().pending };
      delete p[stationId];
      set({ pending: p });
      void get().hydrate();
      return true;
    } catch (e) {
      if (e instanceof FavoriteAuthError) {
        set({ items: [], stationIds: {}, pending: {}, status: "idle" });
        void import("@/stores/authStore").then((m) => {
          m.useAuthStore.getState().clear();
        });
        return false;
      }
      revert({
        title: e instanceof Error ? e.message : "즐겨찾기 처리에 실패했습니다",
        description: null,
      });
      return false;
    }
  },
  updateMemo: async (stationId, memo) => {
    try {
      const res = await updateFavoriteMemoApi(stationId, memo);
      set((s) => ({
        items: s.items.map((item) =>
          item.stationId === stationId ? { ...item, memo: res.memo } : item,
        ),
      }));
      return true;
    } catch (e) {
      if (e instanceof FavoriteAuthError) {
        set({ items: [], stationIds: {}, pending: {}, status: "idle" });
        void import("@/stores/authStore").then((m) => {
          m.useAuthStore.getState().clear();
        });
        return false;
      }
      window.alert(e instanceof Error ? e.message : "메모 저장에 실패했습니다");
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
      notice: null,
      pending: {},
      listSort: "recent",
    }),
}));