/** 장면별 「주변 탐색」진입 허용 — boolean만 바꿔 조정 */
export const SEARCH_THIS_AREA_ALLOW = {
  whileAiRecommend: false,
  whileDestinationPin: true,
  whileHere: true,
  whileNavigating: true,
} as const;

/** true면 거리 무시하고 진입 칩 항상 표시 (디버그) */
export const DEBUG_FORCE_SHOW_SEARCH_THIS_AREA = false;

/** 조회 원점 대비 카메라가 이 거리(m) 이상이면 「주변 탐색하기」칩 */
export const SHOW_BUTTON_MIN_M = 500;
/** 히스테리시스: 이하면 진입 칩 숨김 */
export const HIDE_BUTTON_MIN_M = 300;

/** map 탐색 모드: pan 멈춘 뒤 재조회까지 대기 */
export const FOLLOW_IDLE_MS = 450;
/** map 탐색 모드: 직전 조회 원점 대비 이 거리(m) 이상일 때만 재조회 */
export const FOLLOW_MOVE_MIN_M = 250;
/** map 탐색 모드: 카메라가 GPS에 이 거리(m) 이하면 자동 OFF */
export const EXIT_NEAR_GPS_M = 300;
