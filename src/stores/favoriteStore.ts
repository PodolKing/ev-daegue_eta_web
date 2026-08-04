import { create } from "zustand";

type FavoriteState = {
  /** stationId set — API 연동 전 로컬 UI 토글 */
  stationIds: Record<string, true>;
  isFavorite: (stationId: string) => boolean;
  toggleFavorite: (stationId: string) => void;
  setFavorite: (stationId: string, on: boolean) => void;
};

export const useFavoriteStore = create<FavoriteState>((set, get) => ({
  stationIds: {},
  isFavorite: (stationId) => Boolean(get().stationIds[stationId]),
  toggleFavorite: (stationId) =>
    set((s) => {
      const next = { ...s.stationIds };
      if (next[stationId]) delete next[stationId];
      else next[stationId] = true;
      return { stationIds: next };
    }),
  setFavorite: (stationId, on) =>
    set((s) => {
      const next = { ...s.stationIds };
      if (on) next[stationId] = true;
      else delete next[stationId];
      return { stationIds: next };
    }),
}));
