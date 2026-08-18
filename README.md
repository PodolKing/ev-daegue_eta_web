# EV SafeCharge · Web

**대구 EV 세이프차지** — “가장 가까운 충전소”가 아니라, **도착했을 때 꽂을 수 있을 가능성**이 높은 충전소를 찾는 반응형 웹입니다.

[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=nextdotjs)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](https://react.dev/)

일반 지도 앱은 거리만 보여 줍니다. SafeCharge는 현위치 반경의 **충전소 실상태**를 보고, 대기 가능 대수(`availableCount`)를 구분해 보여 줍니다. 데이터가 없을 때(`null`)와 대기가 없을 때(`0`)를 섞지 않는 것이 제품의 핵심입니다.

지도는 `/map`입니다. 홈(`/`)은 지도로 이동합니다. Backend(`api/`)가 좌표·집계·로그인·결제를 담당하고, 이 앱은 화면과 TMAP만 담당합니다.

## 서비스에서 할 수 있는 일

- **주변 충전소**: TMAP 지도 + 반경 1 / 2 / 3 km 목록. 마커와 카드에 대기 가능 대수를 표시
- **검색·상세**: 충전소 검색, 충전기 유형·주차 정보, 추천 모델 연동(별도 추천 서버)
- **계정**: 이메일 가입/로그인, 카카오·구글·네이버. JWT Bearer · `GET /auth/me`
- **내 정보**: 즐겨찾기, 내 차량, 마이페이지(프로필 수정, 소프트 탈퇴)
- **포인트**: PortOne으로 원→P 충전, 잔액·내역. 관리자만 지갑 수동 조절(`/credit`)
- **이용 결제(데모)**: 대기 충전기 + kWh → 가결제·완료·포인트 차감. 공공 충전기 status는 **읽기만**
- **모바일**: 브라우저 페이지 줌은 막고, 지도 핀치만 `#ev-tmap-map`에서 허용

데모 범위는 동작합니다. 예약, 날씨, 상용 정산급 결제, PortOne 콘솔 취소↔앱 포인트 자동 동기화는 범위 밖입니다.

## Tech stack

| Area | Choice |
|---|---|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| UI | React 19, Tailwind CSS |
| State | Zustand |
| Map | TMAP JavaScript / Web SDK |
| Payments (browser) | PortOne browser SDK |
| API | Backend만 호출 (`NEXT_PUBLIC_API_BASE_URL`) |

프론트는 DB·서버 REST 키에 직접 접근하지 않습니다. 브라우저에 노출되는 것은 지도 SDK용 공개 키뿐입니다.

## Quick start

```bash
cd web
npm install
copy .env.example .env.local   # macOS/Linux: cp .env.example .env.local
npm run dev
```

[http://localhost:3000](http://localhost:3000) — 지도는 `/map`. API 서버(`api/`)도 함께 켭니다.

## Configuration (names only)

| Variable | Role |
|---|---|
| `NEXT_PUBLIC_API_BASE_URL` | Backend base URL |
| `NEXT_PUBLIC_TMAP_MAP_KEY` | TMAP **map SDK** (browser). 서버 `TMAP_APP_KEY`(POI/ETA)와 별개 |

실값은 커밋하지 않습니다. `.env.example`만 참고합니다.

## Related

- Backend: `api` (FastAPI)
- Stations 계약: `docs/stations_api.md`
- 팀 로그: `docs/teamdeveloper.md`

## License / notice

팀 프로젝트·학습용 초안입니다. 상용 정산·전국 확장·원격 제어·예약은 범위 밖입니다.
