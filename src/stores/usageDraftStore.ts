import { create } from "zustand";
import { fetchUsageOrders, type UsageOrderItem } from "@/lib/api";
import { useAuthStore } from "@/stores/authStore";

type UsageDraftState = {
  draft: UsageOrderItem | null;
  loading: boolean;
  hydrate: () => Promise<void>;
  clear: () => void;
};

export async function fetchLatestDraftUsageOrder(): Promise<UsageOrderItem | null> {
  const { items } = await fetchUsageOrders(1, "draft");
  return items[0] ?? null;
}

export function isUsageOrderFeeReady(order: UsageOrderItem): boolean {
  return order.kwhSource === "manual" && Number(order.rateMemberWon) > 0;
}

export const useUsageDraftStore = create<UsageDraftState>((set) => ({
  draft: null,
  loading: false,
  hydrate: async () => {
    if (!useAuthStore.getState().isAuthenticated) {
      set({ draft: null, loading: false });
      return;
    }
    set({ loading: true });
    try {
      const draft = await fetchLatestDraftUsageOrder();
      set({ draft, loading: false });
    } catch {
      set({ draft: null, loading: false });
    }
  },
  clear: () => set({ draft: null }),
}));
