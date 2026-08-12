import { useLocationStore } from "@/stores/locationStore";
import { useMapStore } from "@/stores/mapStore";

declare global {
  interface Window {
    Tmapv2: any;
  }
}

/**
 * 도착지(검색 핀) 기준 충전소 목록·마커 조회.
 * PlaceSummaryBar「주변」·DestinationNearbyChip 공통.
 */
export function queryNearbyStationsAt(lat: number, lng: number) {
  useLocationStore.getState().setFollow(false);
  const { setStationsAnchor, setCenter, setMobileSheetSnap, map } =
    useMapStore.getState();
  setStationsAnchor({ lat, lng, source: "destination" });
  setCenter({ lat, lng });
  setMobileSheetSnap("half");
  if (map && window.Tmapv2?.LatLng && typeof map.setCenter === "function") {
    map.setCenter(new window.Tmapv2.LatLng(lat, lng));
  }
}
