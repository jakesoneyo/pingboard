# pingboard — client

Vite + React + TypeScript + Tailwind v4 프론트엔드. 전체 설계는 저장소 루트의
`SPEC.md` / `DESIGN.md` / `API.md` / `PLAN.md`를 참고한다.
(최종 사용자용 README + 데모 GIF는 덩어리 C에서 저장소 루트에 작성된다.)

## 준비

```bash
cp .env.example .env   # VITE_API_URL — 로컬은 http://localhost:3000
npm install
```

## 실행

```bash
npm run dev   # http://localhost:5173 (백엔드 server/가 3000번에서 떠 있어야 함)
```

## 빌드 / 린트

```bash
npm run build
npm run lint
```

## 구조 요약

- `lib/api.ts` — axios 인스턴스 + JWT 인터셉터(401 시 세션 폐기).
- `lib/socket.ts` — 알림 소켓 싱글턴(`auth.token` 핸드셰이크).
- `hooks/useNotificationSocket.ts` — 앱 루트 1회 마운트. 연결/재연결 시 REST 재동기화,
  `notification:new`/`notification:read`/`presence:sync` 처리.
- `stores/auth.store.ts` — JWT를 localStorage에 저장(트레이드오프: XSS에 httpOnly 쿠키보다
  취약하지만, 소켓 핸드셰이크에 토큰을 JS에서 직접 실어야 해서 이 구조를 선택함).
- `components/ConnectionBadge.tsx` / `NotificationBell.tsx` / `NotificationPanel.tsx` —
  실시간 연결 상태·알림 뱃지·드롭다운·우측 상시 패널(DESIGN.md 3분할 레이아웃).

## 데모 계정

로그인 화면의 "회원가입 없이 둘러보기" 버튼이 서버가 시드한 `admin`/`admin` 계정으로
정상 로그인 API를 호출한다(우회 엔드포인트 없음).
