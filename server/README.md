# pingboard — server

NestJS 11 + TypeORM 0.3 + Neon Postgres 백엔드. 전체 프로젝트 설계는 저장소 루트의
`SPEC.md`/`ARCHITECTURE.md`/`DATA-MODEL.md`/`API.md`/`PLAN.md`를 참고한다.
(사용자용 최종 README + 데모 GIF는 프론트엔드 구현 이후 저장소 루트에 작성될 예정이다.)

## 준비

```bash
cp .env.example .env   # DATABASE_URL / JWT_SECRET 등 값을 채운다
npm install
```

## 스키마 + 데모 데이터

```bash
npm run migration:run   # 빈 DB에 스키마 1회 생성(I1~I4 인덱스 포함)
npm run seed             # admin/admin 등 데모 계정 + 샘플 글·댓글·알림 시드(멱등)
```

## 실행

```bash
npm run start:dev   # http://localhost:3000, Swagger는 /docs
```

## 테스트

```bash
npm test        # 단위 테스트(리포지토리 목, DB 불필요) — notifications.service / notifications.gateway
npm run test:e2e  # supertest e2e — 로컬 DATABASE_URL이 있을 때만 실행, 없으면 자동 skip
```

## Docker

```bash
docker build -t pingboard-server .
docker run --rm -p 3000:3000 \
  -e DATABASE_URL=... -e JWT_SECRET=... -e CORS_ORIGINS=http://localhost:5173 \
  pingboard-server
```

마이그레이션/시드는 컨테이너 기동 시 자동 실행되지 않는다(`migrationsRun: false`) — 배포 후 별도로 1회 실행한다.

## 데모 계정

- `admin` / `admin` — 로그인 시 이메일 형식 검증 예외는 `LoginDto`의 리터럴 `'admin'` 한 값에만 적용되며,
  비밀번호는 항상 정상 bcrypt 비교를 거친다(우회 엔드포인트 없음).
