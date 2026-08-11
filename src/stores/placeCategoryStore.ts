import { create } from "zustand";
import type { PlaceCategoryId } from "@/lib/map/placeCategories";
import type { TmapPlaceResult } from "@/lib/tmap/searchPlaces";

type PlaceCategoryState = {
  active: boolean;
  categoryId: PlaceCategoryId | null;
  items: TmapPlaceResult[];
  selectedId: string | null;

  setResults: (categoryId: PlaceCategoryId, items: TmapPlaceResult[]) => void;
  setSelectedId: (id: string | null) => void;
  clear: () => void;
};

export const usePlaceCategoryStore = create<PlaceCategoryState>((set) => ({
  active: false,
  categoryId: null,
  items: [],
  selectedId: null,

  setResults: (categoryId, items) =>
    set({
      active: true,
      categoryId,
      items,
      selectedId: null,
    }),

  setSelectedId: (selectedId) => set({ selectedId }),

  clear: () =>
    set({
      active: false,
      categoryId: null,
      items: [],
      selectedId: null,
    }),
}));
