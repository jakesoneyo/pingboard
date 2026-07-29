# pingboard — API

> Base URL: `http://localhost:3000` (로컬) · Swagger: `GET /docs`
> 인증: `Authorization: Bearer <accessToken>` (Passport-JWT). 아래 표의 🔒 = 인증 필수.

---

## 1. REST 엔드포인트 요약

| 메서드 | 경로                          | 인증 | 설명                              |
| ------ | ----------------------------- | :--: | --------------------------------- |
| GET    | `/health`                     |  –   | 헬스체크                          |
| POST   | `/auth/register`              |  –   | 회원가입                          |
| POST   | `/auth/login`                 |  –   | 로그인 (데모 계정 포함)           |
| GET    | `/auth/me`                    |  🔒  | 내 정보                           |
| GET    | `/posts`                      |  –   | 게시글 목록 (페이지네이션)        |
| GET    | `/posts/:id`                  |  –   | 게시글 상세 + 댓글 목록           |
| POST   | `/posts`                      |  🔒  | 게시글 작성                       |
| POST   | `/posts/:postId/comments`     |  🔒  | 댓글 작성 → **알림 트리거**       |
| GET    | `/notifications`              |  🔒  | 알림 목록 (**재연결 재동기화용**) |
| GET    | `/notifications/unread-count` |  🔒  | 미읽음 개수                       |
| PATCH  | `/notifications/:id/read`     |  🔒  | 개별 읽음                         |
| PATCH  | `/notifications/read-all`     |  🔒  | 전체 읽음                         |

수정·삭제 엔드포인트는 없다(SPEC 2-2 제외 범위).

---

## 2. 공통 규약

### 에러 응답 (전역 예외 필터로 형태 통일)

```json
{
  "statusCode": 400,
  "message": ["title should not be empty"],
  "error": "Bad Request"
}
```

| 코드 | 상황                                        |
| ---- | ------------------------------------------- |
| 400  | DTO 검증 실패 (class-validator)             |
| 401  | 토큰 없음/만료/위조                         |
| 403  | 남의 알림에 접근 (읽음 처리 시 소유권 위반) |
| 404  | 리소스 없음                                 |
| 409  | 이메일 중복 (DB unique 위반 `23505` → 변환) |

### 날짜

모든 `createdAt`은 ISO 8601 UTC 문자열 (`2026-07-29T10:12:33.000Z`).

---

## 3. Auth

### `POST /auth/register`

```jsonc
// Request
{ "email": "user@example.com", "nickname": "영선", "password": "password123" }
```

| 필드       | 검증 (class-validator)       |
| ---------- | ---------------------------- |
| `email`    | `@IsEmail()` — **예외 없음** |
| `nickname` | `@Length(2, 30)`             |
| `password` | `@Length(8, 64)`             |

```jsonc
// 201
{
  "accessToken": "eyJ...",
  "user": { "id": "uuid", "email": "user@example.com", "nickname": "영선" },
}
```

### `POST /auth/login`

```jsonc
// Request
{ "email": "admin", "password": "admin" } // 데모 계정 예시
```

- **데모 계정 예외**: 로그인 DTO에서만, `email`이 정확히 문자열 `'admin'`인 경우에 한해 이메일 형식 검증을 통과시킨다(커스텀 검증기 또는 `@ValidateIf(o => o.email !== 'admin') @IsEmail()`).
- **비밀번호는 예외 없이 bcrypt 비교를 거친다.** 우회 경로·백도어 엔드포인트는 존재하지 않는다.
- 실패 시 401. 이메일 존재 여부를 노출하지 않도록 메시지는 `"이메일 또는 비밀번호가 올바르지 않습니다."` 하나로 통일.

```jsonc
// 200
{
  "accessToken": "eyJ...",
  "user": { "id": "uuid", "email": "admin", "nickname": "데모관리자" },
}
```

JWT payload: `{ sub: userId, nickname }`, 만료 1일. 이 토큰이 **REST와 소켓 핸드셰이크 양쪽에 그대로 쓰인다.**

### `GET /auth/me` 🔒

```jsonc
// 200
{ "id": "uuid", "email": "admin", "nickname": "데모관리자", "createdAt": "..." }
```

---

## 4. Posts

### `GET /posts?page=1&limit=20`

| 쿼리    | 기본 | 제한   |
| ------- | ---- | ------ |
| `page`  | 1    | ≥ 1    |
| `limit` | 20   | 1 ~ 50 |

```jsonc
// 200
{
  "items": [
    {
      "id": "uuid",
      "title": "실시간 알림 테스트",
      "author": { "id": "uuid", "nickname": "데모관리자" },
      "commentCount": 3,
      "createdAt": "2026-07-29T10:00:00.000Z",
    },
  ],
  "total": 5,
  "page": 1,
  "limit": 20,
}
```

- `commentCount`는 `loadRelationCountAndMap`으로 처리 — 목록 N+1 금지(DATA-MODEL 3-2).
- 본문(`content`)은 목록에 포함하지 않는다.

### `GET /posts/:id`

```jsonc
// 200
{
  "id": "uuid",
  "title": "...",
  "content": "...",
  "author": { "id": "uuid", "nickname": "데모관리자" },
  "createdAt": "...",
  "comments": [
    {
      "id": "uuid",
      "content": "좋은 글이네요",
      "author": { "id": "uuid", "nickname": "demo1" },
      "createdAt": "...",
    },
  ],
}
```

- 404: 존재하지 않는 id.

### `POST /posts` 🔒

```jsonc
// Request  (title: 1~120자, content: 1~5000자)
{ "title": "실시간 알림 테스트", "content": "댓글 달아주세요" }
// 201 → GET /posts/:id 와 동일 형태(comments: [])
```

---

## 5. Comments

### `POST /posts/:postId/comments` 🔒 ⭐

이 프로젝트에서 유일하게 **부수효과(알림 생성 + 소켓 브로드캐스트)** 를 갖는 엔드포인트.

```jsonc
// Request  (content: 1~1000자)
{ "content": "축하합니다!" }
```

```jsonc
// 201
{
  "id": "uuid",
  "content": "축하합니다!",
  "author": { "id": "uuid", "nickname": "demo1" },
  "createdAt": "...",
}
```

**서버 동작 순서 (반드시 이 순서)**

1. 게시글 존재 확인 (없으면 404).
2. **트랜잭션 시작** → `comment` INSERT.
3. `post.authorId !== currentUser.id`일 때만 `notification` INSERT (`type: 'COMMENT'`, `isRead: false`).
   - 같으면(자기 글에 자기 댓글) 알림을 만들지 않는다 — SC-6.
4. **커밋.**
5. **커밋 이후에** `NotificationsGateway.notifyNew(recipientId, dto, unreadCount)` 호출 → `user:{recipientId}` room에 emit.
6. 201 응답.

> 5번이 실패해도(수신자가 오프라인이거나 emit 예외) 201은 정상 반환한다. 알림은 이미 DB에 있으므로 수신자는 다음 접속 시 REST로 받는다. **소켓 실패가 쓰기 요청을 실패시켜서는 안 된다.**

---

## 6. Notifications

### `GET /notifications?unreadOnly=true&limit=100` 🔒

**재연결/로그인 시 재동기화의 주역**(SC-2).

| 쿼리         | 기본    | 설명                                      |
| ------------ | ------- | ----------------------------------------- |
| `unreadOnly` | `false` | `true`면 미읽음만. 재동기화는 항상 `true` |
| `limit`      | 30      | 1 ~ 100 (재동기화는 100)                  |

```jsonc
// 200
{
  "items": [
    {
      "id": "uuid",
      "type": "COMMENT",
      "isRead": false,
      "createdAt": "2026-07-29T10:05:00.000Z",
      "actor": { "id": "uuid", "nickname": "demo1" },
      "post": { "id": "uuid", "title": "실시간 알림 테스트" },
      "commentPreview": "축하합니다!",
    },
  ],
  "unreadCount": 3,
}
```

- 정렬: `createdAt DESC`. 인덱스 I4가 그대로 탄다.
- `commentPreview`는 댓글 본문 앞 50자.
- **항상 `unreadCount`를 함께 반환**한다 — 클라이언트가 목록과 뱃지를 따로 관리하다 어긋나는 걸 막는다.
- 응답의 `items[].id`가 클라이언트 캐시 병합 키다(SC-3 중복 방지).

### `GET /notifications/unread-count` 🔒

```jsonc
// 200
{ "unreadCount": 3 }
```

앱 초기 로드에서 드롭다운을 열기 전 뱃지만 필요할 때 쓰는 경량 엔드포인트.

### `PATCH /notifications/:id/read` 🔒

```jsonc
// 200
{ "unreadCount": 2 }
```

- 본인(`recipientId`) 소유가 아니면 **403**. (id만 알면 남의 알림을 읽음 처리할 수 있는 구멍을 막는다.)
- 이미 읽음이면 그대로 200 (멱등).
- 성공 시 서버가 `user:{userId}` room에 `notification:read` emit → **다른 탭도 동기화**(SC-5).

### `PATCH /notifications/read-all` 🔒

```jsonc
// 200
{ "updatedIds": ["uuid", "uuid"], "unreadCount": 0 }
```

- `UPDATE notifications SET is_read = true WHERE recipient_id = $1 AND is_read = false RETURNING id` 한 방(루프 금지).
- 성공 시 동일하게 `notification:read` emit.

### `GET /health`

```jsonc
// 200
{ "status": "ok", "db": "up", "uptime": 1234 }
```

---

## 7. WebSocket 이벤트

### 7-1. 연결

| 항목      | 값                                                                      |
| --------- | ----------------------------------------------------------------------- |
| URL       | REST와 **동일 오리진·동일 포트** (기본 네임스페이스 `/`)                |
| 전송      | socket.io 기본 (polling → websocket 업그레이드)                         |
| 인증      | `handshake.auth.token` = REST와 같은 JWT access token                   |
| 인증 시점 | 연결 시 1회 (`server.use()` 미들웨어). 이후 이벤트는 신뢰               |
| room      | 인증 성공 시 자동으로 `user:{userId}` 1개에만 join. 클라 요청 room 없음 |

```ts
// 클라이언트
const socket = io(import.meta.env.VITE_API_URL, {
  auth: { token: accessToken },
  autoConnect: false, // 로그인 후 수동 connect
});
```

**인증 실패 응답**

```ts
socket.on("connect_error", (err) => {
  // err.message === 'UNAUTHORIZED'
  if (!socket.active) {
    // 서버가 미들웨어에서 거부 → 자동 재연결 안 됨. 토큰 폐기 후 로그인 화면으로.
  }
});
```

> 토큰이 만료되면 재연결도 같은 이유로 거부된다. 이때 무한 재시도를 하지 않는 것이 미들웨어 방식의 이점이다(ARCHITECTURE 2-1).

### 7-2. 서버 → 클라이언트 이벤트

| 이벤트              | 언제                             | payload                                                  | 클라이언트 처리                                                  |
| ------------------- | -------------------------------- | -------------------------------------------------------- | ---------------------------------------------------------------- |
| `notification:new`  | 내 글에 남이 댓글 작성 (커밋 후) | `{ notification: NotificationDto, unreadCount: number }` | 캐시에 **id 기준 upsert** → 목록 상단 삽입, 뱃지 = `unreadCount` |
| `notification:read` | 내가 어느 탭에서든 읽음 처리     | `{ ids: string[], unreadCount: number }`                 | 해당 id들 `isRead=true`로 갱신, 뱃지 = `unreadCount`             |
| `presence:sync`     | 내 계정의 소켓 연결/해제 시      | `{ connections: number }`                                | 연결 수 배지 갱신 (다중 탭 시연용)                               |

`NotificationDto`는 `GET /notifications`의 `items[]` 원소와 **완전히 동일한 형태**다. 같은 타입을 REST와 소켓이 공유하므로 클라이언트에 변환 분기가 없다.

### 7-3. 클라이언트 → 서버 이벤트

**없다.** 읽음 처리를 포함한 모든 쓰기는 REST로만 이루어진다(ARCHITECTURE 2-3).

### 7-4. 재연결 시 클라이언트 계약 (SC-2의 구현 계약)

```ts
socket.on("connect", () => {
  // 최초 연결과 재연결 모두 이 핸들러를 탄다.
  queryClient.invalidateQueries({ queryKey: ["notifications"] }); // → GET /notifications?unreadOnly=true
});
```

- 이 한 줄이 "끊긴 동안 유실된 emit"을 DB 진실로 덮어쓴다.
- 재조회 결과는 **id 기준 upsert**로 병합되므로, 끊기기 직전 소켓으로 이미 받은 알림과 겹쳐도 중복이 생기지 않는다(SC-3).
- 보조 안전망: TanStack Query `refetchOnWindowFocus`(기본 true) → 탭 복귀 시에도 재동기화.
