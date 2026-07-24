# EV SafeCharge · Web

**대구 EV 세이프차지** — “가장 가까운 충전소”가 아니라, **도착했을 때 꽂을 수 있을 가능성**이 높은 충전소를 찾는 반응형 웹.

[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=nextdotjs)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](https://react.dev/)

## Why this product

일반 지도 앱은 거리만 보여 줍니다. SafeCharge는 **현위치 반경의 충전소 상태**를 보고, 대기 가능 대수(`availableCount`)를 구분해 보여 줍니다.  
`null`(데이터 없음)과 `0`(대기 없음)을 섞지 않는 것이 핵심 설계입니다.

## Highlights

- **TMAP** 기반 지도 UI + BE stations API 연동 마커
- 반경 **3 / 5 / 10 km** 선택, 직선 거리 정렬
- 흰 배경 · Discord풍 레이아웃(아이콘 레일 · 목록 · 맵) — 지도 앱에 맞는 절제된 UI
- 반응형(모바일·Fold 커버 폭 포함) 전제
- 1개월 토이 범위: 외부 로그인 1종 · 포인트 잔액/충전/내역(예정)

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

## Quick start

```bash
npm install
cp .env.example .env.local   # Windows: copy .env.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Configuration (names only)

| Variable | Role |
|---|---|
| `NEXT_PUBLIC_API_BASE_URL` | Backend base URL |
| `NEXT_PUBLIC_TMAP_APP_KEY` | TMAP **map SDK** (browser). Separate from server `TMAP_APP_KEY` |

Never commit real `.env` values. See `.env.example`.

## Related

- Backend repo: `api` (FastAPI · stations · auth/points)
- API contract summary: `docs/fe_rules.md`
- Team conventions: `docs/rules/`

## License / notice

팀 프로젝트·학습용 초안입니다. 상용 정산·전국 확장·원격 제어는 범위 밖입니다.
