# EV SafeCharge · Web

**대구 EV 세이프차지** — "가장 가까운 충전소"가 아니라, **도착했을 때 꽂을 수 있을 가능성**이 높은 충전소를 찾는 반응형 웹.

[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=nextdotjs)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](https://react.dev/)

## Why this product

일반 지도 앱은 거리만 보여 줍니다. SafeCharge는 **현위치 반경의 충전소 상태**를 보고, 대기 가능 대수(`availableCount`)를 구분해 보여 줍니다.
`null`(데이터 없음)과 `0`(대기 없음)을 섞지 않는 것이 핵심 설계입니다.

## Highlights

- **TMAP** 기반 지도 UI + BE stations API 연동 마커
- 반경 **1 / 2 / 3 km** 선택, 직선 거리 정렬
- 흰 배경 · Discord풍 레이아웃(아이콘 레일 · 목록 · 맵) — 지도 앱에 맞는 절제된 UI
- 반응형(모바일·Fold 커버 폭 포함) 전제
- 1개월 토이 범위: 외부 로그인 1종 · 포인트 잔액/충전/내역(진행 중)

## Roadmap (1개월 토이 스코프)

| 주차 | 목표 |
|---|---|
| 1주차 | FE/BE 저장소 분리, TMAP 빈 지도, 로그인 1종 확정 |
| 2주차 | stations 실좌표 마커 연동, 로그인 후 잔액 표시 |
| 3주차 | 포인트 충전 플로우 + 내역 UI |
| 4주차 | 반응형 QA(375 / 393 / 430), 데모 시나리오 정리 |

> 팀 합의사항(2026-07-23/24) 기준 로드맵입니다. 초기 기획서의 대규모 확장(ML 추천 등)은 이번 1개월 범위 밖이며, 필요 시 팀 재합의 후 진행합니다.

## Tech stack

| Area | Choice |
|---|---|
| Framework | Next.js (App Router) |
| Language | TypeScript |
| UI | React 19, Tailwind CSS |
| State | Zustand (도메인 분리) |
| Map | TMAP JavaScript / Web SDK |
| API | 통합 Backend만 호출 (`NEXT_PUBLIC_API_BASE_URL`) |

Frontend는 DB·외부 REST 키에 직접 접근하지 않습니다. 브라우저에 노출되는 것은 지도 SDK용 공개 키뿐입니다.



Open [http://localhost:3000](http://localhost:3000)

## Configuration (names only)

| Variable | Role |
|---|---|
| `NEXT_PUBLIC_API_BASE_URL` | Backend base URL |
| `NEXT_PUBLIC_TMAP_MAP_KEY` | TMAP **map SDK** (browser). Separate from server `TMAP_APP_KEY` (POI/ETA) |

Never commit real `.env` values. See `.env.example`.

## Current status

- 완료: FE 셸/레이아웃, 반경(1/2/3km) UI, TMAP 플레이스홀더 맵, stations API 클라이언트 뼈대
- 진행 중: TMAP SDK 실연동, stations 실좌표 마커 표시
- 예정: 로그인 1종 UI, 포인트 잔액/충전/내역 UI

## Related

- Backend repo: `api` (FastAPI · stations · auth/points)
- API contract summary: `docs/fe_rules.md`
- Team conventions: `docs/rules/`

## License / notice

팀 프로젝트·학습용 초안입니다. 상용 정산·전국 확장·원격 제어는 범위 밖입니다.