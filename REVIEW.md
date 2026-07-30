# pingboard — 배포 전 검수 리포트

> 검수자: reviewer 에이전트 (Opus) · 일시: 2026-07-30 · 대상 커밋: `d844f13` (origin/main과 동기화 상태)
> 방식: 문서(SPEC/ARCHITECTURE/DATA-MODEL/API/PLAN/DESIGN) 대조 + 코드 정독 + **실제 실행 검증**
> (server 빌드/테스트/린트, client 빌드/린트, Docker 이미지 빌드 및 기동, Neon DB 스키마·데이터 직접 조회,
> REST 엔드포인트 curl 프로빙, socket.io 클라이언트로 실시간 시나리오 재현)

## 판정

**🔴 blocker 5건 — 현 상태로는 배포 승인 불가.** 아래 5건을 처리하면 배포 가능 상태가 된다.
핵심 기능(실시간 알림 전달·재동기화·다중 탭·트랜잭션·소켓 인증)은 **실측으로 전부 정상 동작**했다.
막힌 지점은 전부 "스펙/문서 불일치 · 데모 위생 · 빌드 산출물 경로"이며 기능 결함이 아니다.

---

## 검수 중 실행한 것 (근거)

| 항목 | 결과 |
| --- | --- |
| `server: npm run build` | ✅ 통과 |
| `server: npm test` | ✅ 2 suites / 6 tests 통과 (0.55s, DB 불필요) |
| `server: npm run lint` | ✅ 통과 (수정 파일 없음) |
| `client: npm run build` | ✅ 통과 (437KB / gzip 136KB) |
| `client: npm run lint` (oxlint) | ✅ 통과 |
| `docker build` + 컨테이너 기동 | ✅ 이미지 빌드 성공, `/health` → `{"status":"ok","db":"up"}`, `/docs` → 200 |
| Neon DB 스키마·인덱스 직접 조회 | ⚠️ 아래 blocker 1 참조 (인덱스 자체는 정상) |
| REST 프로빙 (401/403/404/409/400/500) | ⚠️ 아래 blocker 2 / 개선 1 참조 |
| socket.io 실시간 시나리오 재현 | ✅ SC-1 / SC-4 / SC-5 / SC-6 / SC-7 실측 통과 |

**⚠️ 검수 과정에서 개발 DB 상태를 바꿨다**: 실시간 검증을 위해 댓글 2건(`REVIEW 검수용 실시간 확인`,
`REVIEW 자기댓글 SC-6`)을 추가했고, `PATCH /notifications/read-all`을 호출해 **admin의 미읽음 알림 7건을 전부 읽음 처리**했다.
→ 현재 admin으로 로그인하면 뱃지가 `0`이다. blocker 3의 DB 리셋으로 함께 해소된다.

---

# 🔴 Blocker (배포 전 필수 수정)

## B1. 모든 테이블의 `created_at` 컬럼이 `createdAt`(camelCase)으로 생성됨 — DATA-MODEL.md 위반

**사실 확인 (Neon DB 실조회):**

```
users.createdAt / posts.createdAt / comments.createdAt / notifications.createdAt   ← 전부 camelCase
users.password_hash / posts.author_id / notifications.recipient_id / is_read       ← 이쪽은 snake_case
```

프론트 구현 에이전트의 보고("notifications만 그런 것 같다")는 **부정확**하다. 4개 테이블 전부다.
원인은 `server/src/common/entities/base.entity.ts`의 `@CreateDateColumn({ type: 'timestamptz' })`에
`name: 'created_at'`이 빠진 것 하나이며, 마이그레이션 `1785327521290-InitSchema.ts`도 `"createdAt"`으로 생성돼
**엔티티와 마이그레이션, 실제 DB는 서로 일치**한다(그래서 기능은 정상).

문제는 **DATA-MODEL.md 2장이 4개 테이블 모두 `created_at`으로 명시**하고 있다는 것 —
면접관이 설계 문서와 실제 스키마를 나란히 보면 바로 드러나는 불일치이고, 한 테이블 안에서
`author_id`(snake) + `createdAt`(camel)이 섞여 있는 것 자체가 리뷰 지적감이다.

지금은 **초기 마이그레이션 1개 + 프로덕션 데이터 0** 상태라 수정 비용이 사실상 0이지만,
배포 후에는 데이터 마이그레이션이 필요해진다. **지금 고쳐야 한다.**

**수정 지시**

1. `server/src/common/entities/base.entity.ts`
   ```ts
   @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
   createdAt: Date;
   ```
2. `server/migrations/1785327521290-InitSchema.ts` 안의 `"createdAt"`을 전부 `"created_at"`으로 치환
   (4개 `CREATE TABLE` + 2개 `CREATE INDEX`). 마이그레이션 파일을 새로 생성하지 말고 **초기 스키마 1개를 유지**한다
   (DATA-MODEL 4-1의 "빈 DB에 migration:run 한 번" 원칙).
3. 로컬 DB를 비우고 `npm run migration:run` → `npm run seed`로 재구성 (blocker 3와 같이 처리).
4. 서비스 코드는 `orderBy('post.createdAt')` 같은 **엔티티 프로퍼티명**을 쓰므로 수정 불필요.
   단 `NotificationsService.markAllRead`의 raw where절(`recipient_id = :userId AND is_read = false`)처럼
   **컬럼명을 문자열로 직접 쓴 곳**이 있는지 재확인할 것(현재 `created_at`을 문자열로 쓰는 곳은 없음 — 확인 완료).

> 참고: PK를 `@PrimaryColumn('uuid', { default: () => 'gen_random_uuid()' })`로 바꾼 건은 **문제 없음**.
> 4개 엔티티가 `BaseEntity` 상속으로 전부 일관되게 적용됐고, 마이그레이션도 `DEFAULT gen_random_uuid()`로 일치하며,
> 실제 INSERT 후 id가 정상 반환되는 것을 e2e·실시간 검증에서 확인했다.

## B2. 공개 엔드포인트가 모든 사용자의 **이메일을 노출** — API.md 위반 + PII 유출

**사실 확인 (인증 없이 호출):**

```
GET /posts?limit=2
{"items":[{"id":"...","title":"e2e 테스트 글",
  "author":{"id":"...","email":"author-1785330743404@e2e.pingboard.dev","nickname":"글쓴이"}, ...
```

API.md 4장·5장·6장은 작성자/actor를 일관되게 `{ "id": "uuid", "nickname": "..." }`로 정의한다.
실제 구현은 `UserSummaryDto`(=`{id, email, nickname}`) **하나를 auth 응답과 공개 응답이 공용**하는 바람에
`GET /posts`, `GET /posts/:id`(댓글 작성자 포함), `GET /notifications`(actor)에서 **가입자 이메일이 전부 새어 나간다**.
`GET /posts`는 인증조차 필요 없으므로 **로그인 없이 전체 사용자 이메일 수집이 가능**하다.

**수정 지시**

1. `server/src/auth/dto/auth-response.dto.ts`에 공개용 DTO를 분리한다.
   ```ts
   /** 타인에게 노출되는 작성자 정보 — 이메일은 절대 포함하지 않는다(API.md 4~6장). */
   export class AuthorSummaryDto {
     @ApiProperty() id: string;
     @ApiProperty() nickname: string;
   }
   ```
   `UserSummaryDto`(email 포함)는 **본인 응답인 `/auth/login`·`/auth/register`·`/auth/me`에서만** 쓴다.
2. `PostListItemDto.author`, `PostDetailDto.author`, `CommentSummaryDto.author`, `NotificationDto.actor`의 타입을
   `AuthorSummaryDto`로 바꾸고, `posts.service.ts` / `comments.service.ts` / `notifications.service.ts`의
   매핑에서 `email:` 라인을 제거한다. QueryBuilder의 `addSelect([... 'author.email'])`, `'actor.email'`도 함께 제거.
3. `client/src/types/index.ts`에 `AuthorSummary { id; nickname }`를 추가하고 `PostListItem.author`,
   `PostDetail.author`, `CommentSummary.author`, `NotificationDto.actor` 타입을 교체한다.
   **클라이언트가 작성자 `email`을 참조하는 코드는 0곳**이므로(grep 확인 완료) 화면 영향은 없다.

## B3. 라이브 DB에 QA 잔여 데이터가 그대로 남아 있고, 시드로는 정리되지 않는다

**사실 확인 (Neon DB 실조회):** users 7 / posts 7 / comments 26 / notifications 24

```
users:    author-1785328185869@e2e.pingboard.dev, commenter-1785330743404@e2e.pingboard.dev ... (e2e 생성 4명)
posts:    "e2e 테스트 글" x2
comments: "curl 테스트 댓글입니다", "offline-hb-0-1785347456443", "SC-2 오프라인 댓글 1-...",
          "3탭 브로드캐스트 1785340116816" ... (QA 흔적 22건)
```

시드 스크립트는 **admin이 존재하면 전체 스킵**(DATA-MODEL 4-3의 멱등 정의 그대로)이므로 `npm run seed`를
다시 돌려도 이 쓰레기는 **절대 사라지지 않는다**. 이 DB로 라이브를 켜면 면접관의 첫 화면이
"e2e 테스트 글 / offline-hb-2-1785347458261"이 된다. 데모 프로젝트에서는 치명적이다.

원인 중 하나는 `server/test/app.e2e-spec.ts`가 실제 개발 DB에 쓰고 **정리하지 않는** 구조라는 점이다
(매 실행마다 유저 2명 + 글 1개 + 댓글 1개 + 알림 1건 누적).

**수정 지시**

1. 배포 직전 아래로 DB를 리셋한다(초기 마이그레이션 1개 구조라 안전하며, B1 수정과 함께 하면 1회로 끝난다).
   ```bash
   cd server
   npm run migration:revert   # InitSchema down() — 테이블 전부 DROP
   npm run migration:run      # 재생성 (B1 수정 반영본)
   npm run seed               # admin/admin + 미읽음 2건 상태 복원
   ```
2. 리셋 후 **다시 QA를 돌리지 말 것**(또는 QA 전용 별도 Neon 브랜치/DB를 쓸 것). 라이브 데모 DB는
   시드 직후 상태 = "글 5개 · 댓글 4개 · admin 뱃지 2"로 고정해서 넘긴다.
3. (권장) `app.e2e-spec.ts`에 `afterAll`을 추가해 생성한 유저를 삭제한다.
   FK가 전부 `ON DELETE CASCADE`이므로 **유저 2명만 지우면 글·댓글·알림까지 함께 정리**된다.

## B4. 저장소 루트 README.md가 없다 — 워크스페이스 필수 요소 + SPEC 4-3의 "완료" 정의 미충족

`server/README.md`·`client/README.md`만 있고 **루트 README가 존재하지 않는다**(둘 다 본문에
"최종 README는 덩어리 C에서 작성 예정"이라고 적혀 있다 — 즉 미완 상태가 문서화만 돼 있음).

- CLAUDE.md S 티어 필수 표: `README + 아키텍처 다이어그램` ✅ 요구
- SPEC.md 4-3: **"SC-2 / SC-3 / SC-4를 각각 GIF로 README에 박아 넣은 시점에 완료"**
  → GIF 3종이 없으면 "재연결 유실 0건 · 다중 탭 브로드캐스트"라는 이 프로젝트의 **유일한 차별점이
  면접관에게 존재하지 않는 것과 같다**(SPEC 원문).

**수정 지시** — 루트 `README.md`에 최소한 다음을 담는다(PLAN C-2 그대로).

1. 한 줄 소개 + 라이브 링크(프론트 Vercel / 백엔드 Render 또는 로컬 실행법)
2. **데모 계정 안내**: `admin` / `admin`, "회원가입 없이 둘러보기" 버튼 존재 명시
3. ARCHITECTURE.md 1장 + 3-2의 mermaid 다이어그램 재사용
4. **데모 GIF 3종**(SC-2 재연결 재동기화 / SC-3 중복 0건 / SC-4 3탭 동시 수신) — 최우선
5. 실행법(로컬 · Docker · `migration:run` · `seed`)
6. ARCHITECTURE 6장 "알려진 한계" 4개 그대로 게재 (Redis 미적용 / 미읽음 전체 재조회 / localStorage 토큰 / 알림 타입 1종)
7. **"내 글" 탭의 클라이언트 사이드 필터 트레이드오프**(개선 4 참조)와 N+1 실측 쿼리 수(아래 🟢 참조)

## B5. `npm run start:prod`와 Dockerfile의 진입점 경로가 실제 빌드 산출물과 불일치

**사실 확인:**

```
$ npm run build && ls dist
dist/src/main.js      ← 실제 산출물 (dist/migrations, dist/scripts도 함께 생성됨)
$ node dist/main.js
Error: Cannot find module '.../server/dist/main.js'     ← package.json "start:prod": "node dist/main"
```

원인: `tsconfig.build.json`의 `exclude`에 `scripts`/`migrations`가 없어서 TS가 rootDir을 패키지 루트로 잡고
`dist/src/...`로 출력한다. **Dockerfile의 `CMD ["node", "dist/main.js"]`도 같은 경로를 가정**한다.

지금 Docker 이미지가 기동되는 것은 **빌드 스테이지에서 `COPY src ./src`만 하기 때문에 우연히 rootDir이 `src`로
잡히는** 덕분이다(실제로 이미지 빌드·기동·`/health` 200을 확인했다). 즉 **로컬 빌드와 Docker 빌드의 산출물 경로가
서로 다르며**, Dockerfile에 `COPY migrations ./migrations`를 빌드 스테이지로 옮기는 등 사소한 변경만으로
**프로덕션 기동이 조용히 깨지는 구조**다. Render 배포 전에 제거해야 할 지뢰다.

**수정 지시**

```jsonc
// server/tsconfig.build.json
{
  "extends": "./tsconfig.json",
  "exclude": ["node_modules", "test", "dist", "scripts", "migrations", "**/*spec.ts"]
}
```
수정 후 기존 `dist` 디렉터리를 지운 뒤 `npm run build && node dist/main.js`로 **로컬에서도 `dist/main.js`가
나오는지** 확인한다(마이그레이션 CLI와 시드는 `ts-node` 경로를 쓰므로 dist 제외의 영향을 받지 않는다 —
`migration:run`/`seed` 재확인 필수).

---

# 🟡 개선 권장 (배포는 가능, 가급적 blocker와 함께 처리)

## 개선 1. 잘못된 형식의 UUID → **500** 응답 (API.md 에러 표에 없는 코드)

```
GET  /posts/not-a-uuid        → 500 {"statusCode":500,"error":"INTERNAL_SERVER_ERROR", ...}
PATCH /notifications/nope/read → 500
GET  /posts/00000000-...-000000000000 → 404 ✅ (정상)
```
Postgres의 `invalid input syntax for type uuid`가 그대로 500으로 새어 나온다. 2줄이면 고쳐진다.

```ts
@Get(':id') findOne(@Param('id', ParseUUIDPipe) id: string) { ... }        // posts.controller
@Patch(':id/read') markRead(@Param('id', ParseUUIDPipe) id: string, ...)   // notifications.controller
@Post() create(@Param('postId', ParseUUIDPipe) postId: string, ...)        // comments.controller
```

## 개선 2. 전역 예외 필터가 5xx를 **로그에 남기지 않는다**

`AllExceptionsFilter`는 HttpException이 아닌 예외를 `{message: '서버 오류가 발생했습니다.'}`로 바꿔 응답하고
**원본 에러를 그대로 버린다**. Render 배포 후 500이 나면 로그에 아무 단서가 없다.
`private readonly logger = new Logger(AllExceptionsFilter.name)`를 두고 non-HttpException일 때
`this.logger.error(message, stack)`를 남길 것(응답 본문은 지금처럼 감춘 채로).

또 `error` 필드가 `HttpStatus[status]`라서 500일 때 `INTERNAL_SERVER_ERROR`가 나가는데,
API.md 예시(`"error": "Bad Request"`)와 표기 규칙이 다르다. 500 케이스만 `'Internal Server Error'`로 맞추면 일관된다.

## 개선 3. 프로덕션 이미지에서 마이그레이션을 실행할 수 없는데 README는 "배포 후 별도 실행"이라고만 안내

Dockerfile production 스테이지가 `COPY migrations ./migrations`로 **`.ts` 마이그레이션**을 넣지만,
`npm ci --omit=dev`로 `ts-node`/`typeorm-ts-node-commonjs`가 빠져 컨테이너 안에서는 실행할 방법이 없다.
`server/README.md`에 "마이그레이션/시드는 **로컬에서 Neon URL을 향해** 1회 실행한다"로 명확히 적거나,
`dist`의 컴파일된 마이그레이션을 쓰도록 정리할 것(현재 `COPY migrations`는 실질적으로 죽은 레이어다).

## 개선 4. "내 글" 탭 — 클라이언트 사이드 필터링(허용 가능하나 문서화 필수)

`MyPostsPage`가 `GET /posts?limit=50`을 받아 `author.id === user.id`로 거르는 구조가 맞다(보고 내용 사실).
**전체 게시글이 50건을 넘으면 51번째 이후의 내 글이 이 탭에서 사라진다.** 데모 규모(현재 7건)에서는 재현되지 않으므로
**S 티어 스코프의 타협으로 허용 가능**하다고 판단한다. 다만 두 가지 중 하나는 해야 한다.

- (권장, 15분) `GET /posts?authorId=<uuid>` 쿼리 파라미터 추가 — `ListPostsQueryDto`에 `@IsOptional() @IsUUID()`,
  서비스에서 `andWhere('post.author_id = :authorId')`. 인덱스는 FK로 커버되고 스펙 확장도 최소다.
- (최소) 루트 README "알려진 한계"에 이 트레이드오프를 한 줄로 명시(코드 주석에는 이미 적혀 있으나 README에는 없다).

## 개선 5. CI가 `eslint --fix`를 실행한다

`server/package.json`의 `"lint": "eslint ... --fix"`를 CI가 그대로 호출한다.
CI에서 자동 수정은 **린트 게이트를 약화**시키고(수정 가능한 위반이 조용히 통과) 결과물도 버려진다.
`"lint": "eslint \"{src,apps,libs,test}/**/*.ts\""` + `"lint:fix"`를 따로 두고 CI는 전자를 부르게 할 것.

## 개선 6. `CORS_ORIGINS` 미설정 시 조용히 전면 차단된다

`parseCorsOrigins()`는 미설정 시 `[]`를 반환하고, REST/소켓 모두 모든 브라우저 오리진을 거부한다
(fail-closed라 보안상으로는 옳다 — 실제로 `https://evil.example` 요청에 ACAO가 안 붙는 것을 확인했다).
문제는 **증상이 "CORS 에러"로만 나타나 원인 파악이 어렵다**는 것. Render 배포 시 이 변수를 빠뜨리면
프론트가 통째로 죽는다. 부팅 시 빈 배열이면 `logger.warn('CORS_ORIGINS 미설정 — 모든 오리진 차단됨')`을 남길 것.

## 개선 7. 기타 소소한 것

- `PostsService.findAuthorId()`가 **어디서도 호출되지 않는 죽은 코드**다(`CommentsService`는 `posts.findOne`을 직접 쓴다). ponytail 원칙에 따라 삭제.
- `seed-demo.ts`가 트랜잭션으로 감싸져 있지 않다. 중간 실패 시 admin만 생긴 채로 남고, 이후 재실행은 "이미 있음"으로 스킵되어 **반쪽 데이터로 고착**된다. `dataSource.transaction()` 한 겹이면 해결.
- `JwtStrategy.validate`가 매 요청 `password_hash`까지 포함한 전체 User row를 읽는다(응답에 나가진 않음). `select: { id: true, email: true, nickname: true }`로 좁히면 깔끔하다.
- DATA-MODEL 3-2가 게시글 목록을 "쿼리 2개 이내"라고 적었는데 **실측 3개**다(distinct-id / 본문 / 댓글수 집계). N+1은 없으므로 주장 자체는 유효하지만, 숫자는 README·문서에 실측값으로 적을 것.
- 로그인 레이트리밋이 없다(브루트포스). S 티어 필수 요소는 아니므로 README "알려진 한계"에 한 줄이면 충분하다.
- 레이아웃이 `grid-cols-[200px_1fr_260px]` 고정이라 **좁은 화면·모바일에서 3열이 그대로 눌린다**. DESIGN.md가 데스크톱 1040px 고정을 명시했으므로 스펙 위반은 아니지만, 면접관이 폰으로 열어볼 가능성은 있다.

---

# 🟢 통과 (실측 확인 완료)

## 워크스페이스 표준 (CLAUDE.md)

- ✅ **Passport-JWT** — `JwtStrategy` + `JwtAuthGuard`, 토큰 없음/위조 → 401 확인
- ✅ **@nestjs/swagger** — 컨테이너에서 `/docs` 200, 12개 엔드포인트 전부 매핑 로그로 확인
- ✅ **단위 테스트(S 티어 "핵심만")** — 6 tests 통과. SC-6(자기 댓글 무알림) / SC-8(알림 저장 실패 전파) / SC-7(소켓 인증) / 다중 탭 registry를 정확히 겨냥
- ✅ **Testcontainers 미적용** — S 티어 표에서 면제(`—`). 문서에 근거까지 명시돼 있어 적절
- ✅ **GitHub Actions CI** — `server(lint→build→test)` + `client(lint→build)` **양쪽 잡 모두 존재**, e2e를 CI에서 제외한 이유가 주석으로 남아 있음
- ✅ **Dockerfile** — multi-stage, `--include=dev`로 빌드 후 prod 스테이지 분리. **실제 이미지 빌드·기동·DB 연결까지 검증**
- ✅ **`/health`** — DB ping 포함, `{"status":"ok","db":"up","uptime":...}`
- ✅ **시크릿 미커밋** — `git ls-files` / 전체 히스토리(`--all`) 스캔 결과 커밋된 env 파일은 `*.env.example` 2개뿐. 루트/`server`/`client`의 `.env`는 전부 gitignore 처리됨
- ✅ **커밋 규약** — Conventional Commits 9개, 한국어 일관, 논리 단위 분리(`feat(server): 실시간 알림 + WebSocket Gateway ⭐` 등)
- ✅ **주석 규칙** — 파일 상단 역할 1~2줄 / 공개 메서드 "왜" 중심 JSDoc / 트랜잭션·소켓 인증 같은 비자명 로직에 의도 주석. 자명한 주석 없음

## 데모 계정 규약 (가장 민감한 부분 — 전항 통과)

- ✅ 버튼 문구 **정확히** `회원가입 없이 둘러보기`, 보조 설명 **정확히** `회원가입 없이 체험해 볼 수 있습니다.` (`LoginPage.tsx` 83·86행)
- ✅ 이메일 형식 예외가 **`LoginDto` 한 곳의 리터럴 `'admin'`에만** 적용 (`@ValidateIf((o) => o.email !== 'admin') @IsEmail()`). `RegisterDto`는 예외 없는 `@IsEmail()`
- ✅ 프론트 `loginSchema`도 동일한 좁은 예외, `registerSchema`는 예외 없음
- ✅ **비밀번호 우회 없음** — 데모 버튼이 일반 `useLogin` → `POST /auth/login` → `bcrypt.compare`를 그대로 탄다. 실제로 `admin`/`admin` 로그인 성공 확인
- ✅ **백도어 엔드포인트 없음** — 라우트 매핑 전수 확인 결과 인증 없이 세션을 발급하는 경로는 존재하지 않음
- ✅ 로그인 실패 메시지가 이메일 존재 여부를 구분하지 않음(사용자 열거 방지)

## 스펙 준수 (SPEC / API / ARCHITECTURE / DATA-MODEL)

- ✅ **SC-1 실시간 전달** — demo1이 admin 글에 댓글 → admin 소켓에 `notification:new` 즉시 도착(왕복 포함 체감 지연 1초 미만)
- ✅ **SC-4 다중 탭 브로드캐스트** — 같은 계정 소켓 2개 모두 수신, `presence:sync {connections: 1 → 2}` 정상. `user:{userId}` room 방식이라 `Map<userId, socket>` 안티패턴 없음
- ✅ **SC-5 읽음 동기화** — `PATCH /notifications/read-all` → 두 탭 모두 `notification:read {ids: 7, unreadCount: 0}` 수신
- ✅ **SC-6 자기 댓글 무알림** — admin이 자기 글에 댓글 → unreadCount 7 → 7 변화 없음
- ✅ **SC-7 소켓 인증** — **`afterInit`의 `server.use()` 미들웨어에서 `next(new Error('UNAUTHORIZED'))`로 거부**하는 방식이 맞다(`handleConnection` 사후 disconnect 아님). 실측: 토큰 없음/위조 모두 `connect_error(UNAUTHORIZED)`, `socket.active === false`, **1.5초 대기 후 재연결 시도 누적 0회** → 재연결 무한 루프 없음 확인
- ✅ **SC-8 트랜잭션 원자성 + emit 순서** — `CommentsService.create`가 `dataSource.transaction`으로 댓글 INSERT와 알림 INSERT를 같은 `manager`로 묶고(`NotificationsService.createForComment(manager, ...)`), **커밋이 끝난 뒤에야** `notifyCreated`를 호출한다. emit 경로는 `try/catch`로 감싸 실패를 삼키므로 **소켓 실패가 201을 막지 않는다**(API.md 5장 순서 1~6 그대로)
- ✅ **재동기화 계약(SC-2/SC-3)** — 클라이언트 `socket.on('connect')` → `invalidateQueries(['notifications'])` 1줄, 서버 응답은 항상 `unreadCount` 동봉, 소켓 수신분은 **id 기준 upsert**로 병합. 알림 목록의 소유자가 TanStack Query 캐시 하나뿐이라 중복이 구조적으로 발생하지 않음(코드 리뷰 기준 통과 — 오프라인 토글 육안 확인은 사람 QA 몫)
- ✅ **인덱스 I1~I4 전부 생성, 컬럼 순서 명세대로** (DB 실조회)
  ```
  users(email) UNIQUE
  posts("createdAt")
  comments(post_id, "createdAt")
  notifications(recipient_id, is_read, "createdAt")   ← equality 2개가 sort 컬럼보다 앞 ✅
  ```
  (컬럼명은 B1 대상. `DESC` 미지정은 문제없다 — 선행 컬럼이 전부 등호이므로 Postgres가 인덱스를 역방향 스캔한다)
- ✅ **N+1 없음 — 실측 쿼리 카운트** (`logging: ['query']`로 직접 계수)

  | 화면 | 쿼리 수 | 내역 |
  | --- | --- | --- |
  | `GET /posts?limit=20` | **3** | distinct-id / 본문+작성자 조인 / `comments GROUP BY post_id` 집계 1회 |
  | `GET /posts/:id` | **1** | post+author+comments+commentAuthor 단일 조인 |
  | `GET /notifications` | **3** (+ 인증 1) | distinct-id / actor·post·comment 조인 / count |

  글·댓글·알림 건수에 비례해 늘어나는 쿼리가 **한 건도 없다**. `loadRelationCountAndMap`이 IN 절 집계 1회로 처리됨
- ✅ **에러 응답 일관성** — 400(검증, 메시지 배열) / 401 / 403(남의 알림 읽음 시도 실제 차단 확인) / 404 / 409(중복 이메일, `23505` → 변환)가 전부 API.md 2장 형태와 일치
- ✅ **CORS 화이트리스트** — 허용 오리진엔 ACAO 부여, `https://evil.example`엔 미부여. REST와 소켓이 `parseCorsOrigins()` 하나를 공유
- ✅ **SSL 판별 공용 헬퍼** — 런타임 설정과 CLI DataSource가 `isSslRequiredHost` 하나를 공유(newGym 사고 재발 방지 의도대로 구현됨)
- ✅ **`synchronize: false` / `migrationsRun: false`** — 스키마 변경 경로가 마이그레이션 1개로 단일화
- ✅ **응답 DTO 매핑** — 엔티티 직접 반환 없음, `password_hash`가 응답에 노출되는 경로 없음(전 엔드포인트 프로빙 확인)
- ✅ **클라 → 서버 소켓 이벤트 0개** — 쓰기는 전부 REST(두 번째 보안 표면 없음)
- ✅ **DESIGN.md 준수** — 시안 C 팔레트 6색이 `index.css` `@theme`에 그대로, 3분할 + `max-w-[1040px]` 중앙 정렬(사람이 명시 요청한 풀블리드 금지) 준수

---

## 배포 전 체크리스트 (권장 순서)

1. [ ] **B1** `base.entity.ts` + `InitSchema` 마이그레이션의 `created_at` 수정
2. [ ] **B5** `tsconfig.build.json` exclude 수정 → `dist/main.js` 확인
3. [ ] **B2** 공개 응답에서 `email` 제거 (server DTO 4곳 + client 타입)
4. [ ] 개선 1·2·5·7 (ParseUUIDPipe / 5xx 로깅 / lint --fix 분리 / 죽은 코드 삭제) — 여기까지 한 커밋으로 묶어도 무방
5. [ ] `npm run lint && npm test && npm run build` (server) / `npm run lint && npm run build` (client) 재확인
6. [ ] **B3** DB 리셋 → `migration:run` → `seed` → **admin 로그인 시 뱃지 2 육안 확인** (이후 QA로 오염시키지 말 것)
7. [ ] **B4** 루트 README + **GIF 3종(SC-2/SC-3/SC-4)** 작성 — SPEC이 정의한 "완료"의 필수 조건
8. [ ] SPEC 4-1 SC-2 / SC-3을 브라우저 Offline 토글로 **사람이 직접 육안 확인**(코드 리뷰로는 여기까지가 한계)
9. [ ] Vercel(client) → `VITE_API_URL` / Render(server) → `DATABASE_URL`·`JWT_SECRET`·**`CORS_ORIGINS`(Vercel 도메인)** 시크릿 등록
10. [ ] 사람 승인 게이트 → 배포

> **배포 결정은 사람이 한다.** 이 문서는 판단 근거일 뿐이며, blocker 5건이 해소되기 전에는 승인 요청을 올리지 않기를 권한다.
