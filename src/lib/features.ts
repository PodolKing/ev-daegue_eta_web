/**
 * Feature flags — false면 UI에 「미구현」을 명시해 버그로 오해하지 않게 한다.
 * 연동 끝나면 true로 바꾸고 배지/문구를 제거한다.
 */
export const FEATURES = {
  /** TMAP 장소/주소 검색 API */
  tmapPlaceSearch: true,
  /** 현위치 버튼 → geolocation + map center */
  moveToMyLocation: true,
  /** BE stations 반경(Haversine) 필터 — UI 뼈대만 있는 동안 false */
  radiusFilter: false,
} as const;
