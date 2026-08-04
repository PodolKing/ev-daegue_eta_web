import { create } from "zustand";
import { fetchRecommendations } from "@/lib/api";
import type { RecommendItem, RecommendMeta } from "@/types/recommend";

type RecommendState = {
  /** AI 추천 패널·마커 표시 중 */
  active: boolean;
  loading: boolean;
  error: string | null;
  items: RecommendItem[];
  meta: RecommendMeta | null;
  selectedStatId: string | null;

  /** 도착지(빨간 마커) 기준 추천 조회 — 길찾기 전 목록·마커 */
  loadForDestination: (dest: {
    lat: number;
    lng: number;
    etaMinutes?: number;
  }) => Promise<void>;
  setSelectedStatId: (id: string | null) => void;
  clear: () => void;
};

export const useRecommendStore = create<RecommendState>((set) => ({
  active: false,
  loading: false,
  error: null,
  items: [],
  meta: null,
  selectedStatId: null,

  loadForDestination: async ({ lat, lng, etaMinutes = 15 }) => {
    set({
      active: true,
      loading: true,
      error: null,
      items: [],
      meta: null,
      selectedStatId: null,
    });
    try {
      const res = await fetchRecommendations({
        destLat: lat,
        destLng: lng,
        etaMinutes: Math.max(1, etaMinutes),
        radiusKm: 2,
        topK: 10,
        includeSlow: false,
      });
      set({
        loading: false,
        items: res.recommendations ?? [],
        meta: res.meta ?? null,
        error:
          (res.recommendations?.length ?? 0) === 0
            ? "조건에 맞는 추천 충전소가 없습니다."
            : null,
      });
    } catch (e) {
      set({
        loading: false,
        items: [],
        meta: null,
        error: e instanceof Error ? e.message : "추천 요청 실패",
      });
    }
  },

  setSelectedStatId: (selectedStatId) => set({ selectedStatId }),

  clear: () =>
    set({
      active: false,
      loading: false,
      error: null,
      items: [],
      meta: null,
      selectedStatId: null,
    }),
}));
