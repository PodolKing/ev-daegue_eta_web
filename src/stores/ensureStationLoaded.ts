import { fetchStations } from "@/lib/api";
import { useMapStore } from "@/stores/mapStore";
import type { Station } from "@/types/station";

/** AI 추천 statId → 근처 /stations로 info hydrate 후 mapStore에 merge */
export async function ensureStationLoaded(
  statId: string,
  lat: number,
  lng: number,
): Promise<Station | null> {
  const existing = useMapStore
    .getState()
    .stations.find((s) => s.stationId === statId);
  if (existing) return existing;

  const data = await fetchStations({ lat, lng, radiusKm: 1 });
  const items = data.items ?? [];
  useMapStore.getState().upsertStations(items);
  return (
    useMapStore.getState().stations.find((s) => s.stationId === statId) ?? null
  );
}