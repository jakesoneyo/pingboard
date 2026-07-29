# pingboard — PLAN

> S 티어(하루). 작업은 **큰 덩어리 3개**로만 쪼갠다. 각 덩어리는 `implementer`(Sonnet) 서브에이전트가 한 번에 받아
> 처음부터 끝까지 완주할 수 있는 단위다. 잘게 쪼개면 콜드스타트 오버헤드가 실제 작업량을 넘는다.

| 덩어리 | 범위                     | 담당             | 예상   | 사람 게이트      |
| ------ | ------------------------ | ---------------- | ------ | ---------------- |
| **0**  | 사전 준비 (Neon DB·레포) | 메인 세션        | 20분   | –                |
| **A**  | 백엔드 전체              | implementer      | 3.5~4h | –                |
| **–**  | 디자인 시안 A/B          | 메인 세션 + 사람 | 20분   | ✅ **시안 선택** |
| **B**  | 프론트엔드 전체          | implementer      | 3~3.5h | –                |
| **C**  | QA · 문서 · 배포         | 메인 세션        | 1.5h   | ✅ **배포 승인** |

---

## 덩어리 0 — 사전 준비 (메인 세션, implementer 아님)

1. Neon에 `pingboard` DB 생성 → `DATABASE_URL` 확보
2. `git init` + GitHub 레포 `jakesoneyo/pingboard` 생성, `.gitignore`에 `.env` 포함 확인
3. `server/.env.example` 작성: `DATABASE_URL`, `JWT_SECRET`, `JWT_EXPIRES_IN=1d`, `CORS_ORIGINS`, `PORT`
4. `client/.env.example`: `VITE_API_URL`

> **`.env`는 절대 커밋하지 않는다.** 실제 값은 로컬 파일 + 배포 플랫폼 시크릿에만.

---

## 덩어리 A — 백엔드 전체 (implementer 1회 위임)

**목표: `npm run start:dev` + `npm run seed` 후, Postman/curl만으로 SC-6·SC-7·SC-8을 증명할 수 있는 상태.**

### A-1. 뼈대 (30분)

- `nest new server` (npm, TypeScript) · 불필요 보일러플레이트 정리
- 패키지: `@nestjs/typeorm typeorm pg @nestjs/config @nestjs/jwt @nestjs/passport passport passport-jwt bcrypt class-validator class-transformer @nestjs/swagger @nestjs/websockets @nestjs/platform-socket.io socket.io`
- `config/typeorm.config.ts` + `config/data-source.ts` — **SSL 판별 헬퍼(`isSslRequiredHost`)를 두 곳이 공유**(DATA-MODEL 4-2). `synchronize: false`, `migrationsRun: false`, pool `max: 5`
- `main.ts`: 전역 `ValidationPipe({ whitelist: true, transform: true })`, **CORS는 화이트리스트 방식**(`origin: true` 같은 전체 허용 금지), Swagger `/docs`, 전역 예외 필터
- `health` 모듈: `GET /health` (DB ping 포함)

### A-2. 엔티티 + 마이그레이션 (40분)

- 엔티티 4개(User/Post/Comment/Notification) — DATA-MODEL 2장 컬럼·제약 그대로
- 인덱스 I1~I4를 **엔티티 데코레이터에 선언** (I4는 `@Index(['recipientId','isRead','createdAt'])`, 컬럼 순서 반드시 준수)
- `npm run migration:generate -- migrations/InitSchema` → **생성물을 직접 열어 검토**(예상치 못한 DROP 없는지) → `migration:run`으로 빈 DB에서 통째로 서는지 확인
- 관계는 `eager: false`. 조인은 전부 명시적으로

### A-3. Auth (40분)

- `POST /auth/register` / `POST /auth/login` / `GET /auth/me` (API.md 3장)
- bcrypt cost 10, JWT payload `{ sub, nickname }`, 만료 1일
- `JwtStrategy`, `JwtAuthGuard`, `@CurrentUser()` 데코레이터
- **데모 계정 예외는 LoginDto 한 곳에만**: `@ValidateIf(o => o.email !== 'admin') @IsEmail()`. RegisterDto에는 절대 적용 금지
- 이메일 중복은 DB `23505`를 잡아 409로 변환

### A-4. Posts + Comments (50분)

- `GET /posts`(페이지네이션 + `commentCount`), `GET /posts/:id`(댓글+작성자), `POST /posts`
- `POST /posts/:postId/comments` — **A-5의 알림 생성을 트랜잭션 안에서 호출**
- **N+1 금지**: 목록은 `leftJoin` + `loadRelationCountAndMap`, 상세는 `leftJoinAndSelect`. `logging: ['query']`로 실제 쿼리 수를 세어 확인
- 응답은 엔티티 직접 반환 금지, DTO로 매핑(`password_hash` 유출 차단)

### A-5. Notifications + Gateway ⭐ (60분, 이 덩어리의 핵심)

- `NotificationsService`
  - `createForComment(manager, {post, comment, actor})` — **트랜잭션 매니저를 인자로 받는다**(댓글과 한 트랜잭션). `post.authorId === actor.id`면 **아무것도 안 하고 반환**(SC-6)
  - `findMany(userId, {unreadOnly, limit})` / `countUnread(userId)` / `markRead(userId, id)` / `markAllRead(userId)`
  - `markRead`는 소유권 검사 후 아니면 403
- `NotificationsController` — API.md 6장 4개 엔드포인트
- `UserSocketRegistry` — `Map<string, Set<string>>`. `add/remove/count`. **`remove`에서 Set이 비면 Map 키 삭제**(누수 방지)
- `NotificationsGateway`
  - `afterInit(server)`에서 `server.use(...)` 인증 미들웨어 등록 → `jwtService.verifyAsync(handshake.auth.token)`, 성공 시 `socket.data.userId`, 실패 시 `next(new Error('UNAUTHORIZED'))`
  - `handleConnection`: `socket.join('user:'+userId)` + registry add + `presence:sync` emit
  - `handleDisconnect`: registry remove + `presence:sync` emit (남은 연결이 있을 때만)
  - `notifyNew(recipientId, dto, unreadCount)` / `notifyRead(userId, ids, unreadCount)` — `server.to('user:'+id).emit(...)`
  - `@WebSocketGateway({ cors: { origin: <화이트리스트> } })`, 별도 포트 지정 없이 HTTP 서버 공유
- **emit 호출은 반드시 트랜잭션 커밋 이후.** emit 실패가 201 응답을 막지 않도록 방어

### A-6. 시드 · 테스트 · Docker · CI (50분)

- `scripts/seed-demo.ts` — DATA-MODEL 4-3 그대로(멱등, admin 있으면 스킵, 미읽음 2건 남기기)
- 테스트 **3개 스위트만**(S 티어 "핵심만"), 리포지토리 목 사용 → DB 없이 CI에서 돈다
  1. `notifications.service.spec.ts` — 남의 글 댓글 시 알림 1건 생성 / **자기 글이면 0건**(SC-6) / 알림 저장 실패 시 트랜잭션 롤백(SC-8)
  2. `notifications.gateway.spec.ts` — 유효 토큰 → `next()` 호출 + room join / 무효·만료 토큰 → `next(Error)` (SC-7) / 같은 userId 소켓 2개 등록 시 registry count 2 (SC-4의 서버 측 근거)
  3. `app.e2e-spec.ts` (supertest) — 회원가입 → 로그인 → 글 작성 → 다른 유저로 댓글 → `GET /notifications`에 1건 (인메모리 목 또는 로컬 DB, CI에서는 skip 조건 허용)
- `Dockerfile` — multi-stage, `node:22-alpine`. **`npm ci --include=dev && npm run build`** 후 prod 스테이지(newGym에서 devDeps 누락으로 빌드 실패한 사고 반복 금지)
- `.github/workflows/ci.yml` — server: lint → build → test / client 스텝은 덩어리 B 이후 추가

### A 완료 조건 (implementer가 스스로 확인)

- [ ] 빈 DB에 `migration:run` 1회로 스키마 완성, `npm run seed`로 데모 데이터 생성
- [ ] `/docs`에 12개 엔드포인트가 전부 노출
- [ ] curl로 admin 로그인 → 다른 계정으로 admin 글에 댓글 → `GET /notifications`에 1건
- [ ] 자기 글에 자기 댓글 → 알림 0건
- [ ] `wscat` 또는 간이 스크립트로 토큰 없이 소켓 연결 시 `connect_error`
- [ ] `npm test` 전부 통과

---

## 사람 게이트 ① — 디자인 시안 선택 (덩어리 B 전)

메인 세션이 `design-taste-frontend` 계열 스킬로 시안 2~3개를 제시 → 사람이 A/B 선택.
알림 뱃지·드롭다운이 화면에서 **눈에 확 띄는지**가 선택 기준이다(이 프로젝트의 주인공).

---

## 덩어리 B — 프론트엔드 전체 (implementer 1회 위임)

**목표: 브라우저 2개·탭 3개로 SC-1~SC-5를 육안 확인할 수 있는 상태.**

### B-1. 뼈대 + 인증 (50분)

- `npm create vite@latest client -- --template react-ts` + Tailwind v4(`@tailwindcss/vite`) + react-router + zustand + @tanstack/react-query + axios + zod + lucide-react + socket.io-client
- `lib/api.ts` — axios 인스턴스, JWT 인터셉터, 401 시 토큰 폐기 + 로그인 이동
- `stores/auth.store.ts` — token/user, localStorage 영속(트레이드오프는 README에 명시)
- 로그인/회원가입 페이지 + 보호 라우트
- **데모 버튼**: 문구 **"회원가입 없이 둘러보기"**, 보조 안내 **"회원가입 없이 체험해 볼 수 있습니다."** — 눈에 띄게, 원클릭으로 `admin`/`admin` 로그인

### B-2. 게시판 (50분)

- 목록(페이지네이션·댓글 수)·상세(댓글 목록+작성 폼)·작성 페이지
- TanStack Query 훅으로 조회, mutation 후 관련 쿼리 invalidate
- 폼 검증은 Zod (백엔드 class-validator 규칙과 동일한 길이 제한)

### B-3. 소켓 + 알림함 ⭐ (70분, 이 덩어리의 핵심)

- `lib/socket.ts` — `io(VITE_API_URL, { auth: { token }, autoConnect: false })` 싱글턴. 로그인 시 `connect()`, 로그아웃 시 `disconnect()` + 토큰 교체 시 재생성
- `hooks/useNotificationSocket.ts` — 앱 루트에서 1회만 마운트
  - `connect` → **`queryClient.invalidateQueries({ queryKey: ['notifications'] })`** ← SC-2의 전부
  - `notification:new` → 캐시에 **id 기준 upsert**(있으면 교체, 없으면 앞에 삽입) + `unreadCount`는 **서버값으로 덮어쓰기**(직접 +1 금지)
  - `notification:read` → 해당 id들 `isRead=true` + `unreadCount` 서버값
  - `presence:sync` → Zustand의 `connections` 갱신
  - `connect_error` → `socket.active === false`면 토큰 폐기 + 로그인 이동(무한 재시도 금지)
  - `disconnect` → 상태 배지를 "재연결 중"으로
- `useNotifications.ts` — `GET /notifications?unreadOnly=true` 쿼리 + 읽음 mutation
- `NotificationBell.tsx` — 헤더 우측 종 아이콘 + 미읽음 뱃지 + 드롭다운(actor 닉네임·글 제목·댓글 미리보기·상대시간), 클릭 시 읽음 처리 + 해당 글로 이동, "모두 읽음" 버튼
- `ConnectionBadge.tsx` — `연결됨 · 탭 N`. 끊기면 `재연결 중…`. **다중 탭/재연결을 면접관이 눈으로 보게 만드는 장치이므로 헤더에 상시 노출**

### B 완료 조건

- [ ] 데모 버튼 원클릭 로그인 → 알림 뱃지 2 (시드 미읽음)
- [ ] 브라우저 2개로 SC-1(1초 이내 실시간 수신) 확인
- [ ] 탭 3개로 SC-4(3탭 모두 수신, 배지 `탭 3`) · SC-5(읽음 동기화) 확인
- [ ] DevTools Offline 토글로 SC-2·SC-3 확인 (오프라인 중 댓글 3개 → 복구 시 3건 추가, 중복 없음)
- [ ] `npm run build` 통과, 콘솔 에러 0

---

## 덩어리 C — QA · 문서 · 배포 (메인 세션)

### C-1. SC 시나리오 수동 QA (30분)

SPEC 4-1의 SC-1 ~ SC-9를 **순서대로 실제로 수행**하고 결과를 기록한다. 특히:

- **SC-2**: DevTools Network를 Offline로 → 다른 브라우저에서 댓글 3개 → Online 복구 → 3건 모두 들어오는지. (서버 재시작 버전도 한 번 더 — Render 콜드스타트 시뮬레이션)
- **SC-3**: 위 직후 중복 없는지 id 확인
- **SC-4/5**: 탭 3개

실패 항목이 있으면 **덩어리 C를 중단하고 원인 수정 후 재실행**. 이 3개가 이 프로젝트의 존재 이유다.

### C-2. README + 데모 GIF (40분)

- 실행법(로컬 Docker 포함), 아키텍처 mermaid(ARCHITECTURE 1장·3-2 재사용), 기술 스택
- **GIF 3종 필수**: ① 실시간 수신 ② 오프라인→복구 재동기화 ③ 3탭 동시 수신
- "알려진 한계"(ARCHITECTURE 6장) 그대로 게재 — Redis 미적용/localStorage 토큰을 숨기지 않는다
- 트러블슈팅 섹션: 구현 중 실제로 겪은 문제만 기록(없으면 억지로 쓰지 않는다)

### C-3. 배포 (20분 + 승인)

1. 프론트 Vercel (root: `client/`), `VITE_API_URL` 시크릿
2. **사람 게이트 ②**: 라이브 미리보기 + 리뷰 요약 제시 → OK 후 진행
3. 백엔드 Render(Docker, root: `server/`) — 승인 시에만. `DATABASE_URL`/`JWT_SECRET`/`CORS_ORIGINS` 시크릿, 배포 후 `migration:run` + `seed` 1회
   - Render 무료 티어 스핀다운 → 첫 접속 콜드스타트 → 재연결 재동기화가 실제로 동작하는 걸 라이브에서 보여줄 수 있다. README에 이 점을 명시
   - 배포하지 않기로 하면 README에 로컬 실행법 + GIF만으로 마감

### C-4. 마감 (10분)

- Conventional Commits로 의미 단위 커밋 정리 (`feat:` / `test:` / `docs:` / `chore:`)
- `_portfolio-index/INDEX.md`에 04번 항목 추가, 커버리지 표의 **실시간(WebSocket) 0 → 1**, `WebSocket 실시간 ☐ → ☑`
- `_portfolio-index/backlog.md`의 "실시간 채팅 + 알림" 항목에 pingboard로 알림 부분 커버됨 표기 + 다음 추천을 **데이터/알고리즘**으로 갱신

---

## 리스크와 컷 라인

시간이 부족하면 **이 순서로 잘라낸다**(위에서부터 먼저 버림).

1. `ConnectionBadge`의 "탭 N" 표시 → 단순 연결/끊김 표시로 축소 (단, SC-4 GIF는 뱃지 증가로 대체 증명)
2. 게시글 페이지네이션 → 최신 20건 고정
3. `PATCH /notifications/:id/read` 개별 읽음 → "모두 읽음"만
4. e2e(supertest) 스위트 → 단위 테스트 2개만 유지

**절대 자르지 않는 것**: 재연결 REST 재동기화(SC-2/3), userId room 브로드캐스트(SC-4), 소켓 JWT 미들웨어 인증(SC-7), 댓글+알림 단일 트랜잭션(SC-8), 데모 계정(SC-9).
이 5개가 없으면 pingboard는 흔한 게시판 CRUD가 된다.
