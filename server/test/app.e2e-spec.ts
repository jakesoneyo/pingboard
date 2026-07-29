// 로컬 .env의 DATABASE_URL이 있어야만 돈다. CI 시크릿이 없으면 스킵한다(PLAN A-6 "CI에서는 skip 조건 허용").
import 'dotenv/config';

import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';

const hasDatabase = Boolean(process.env.DATABASE_URL);
const describeIfDb = hasDatabase ? describe : describe.skip;

/**
 * 회원가입 → 로그인 → 글 작성 → 다른 유저로 댓글 → 알림 1건 생성까지의 전체 경로를 검증한다.
 * 로컬 Neon DB에 실제로 데이터를 남기므로 매 실행마다 유일한 이메일을 사용한다.
 */
describeIfDb('댓글 작성 → 알림 생성 (e2e)', () => {
  let app: INestApplication;
  const runId = Date.now();

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('남의 글에 댓글을 달면 GET /notifications에 1건이 잡힌다', async () => {
    const server = app.getHttpServer();

    const authorRes = await request(server)
      .post('/auth/register')
      .send({
        email: `author-${runId}@e2e.pingboard.dev`,
        nickname: '글쓴이',
        password: 'password123',
      })
      .expect(201);
    const authorToken = authorRes.body.accessToken;

    const commenterRes = await request(server)
      .post('/auth/register')
      .send({
        email: `commenter-${runId}@e2e.pingboard.dev`,
        nickname: '댓글러',
        password: 'password123',
      })
      .expect(201);
    const commenterToken = commenterRes.body.accessToken;

    const postRes = await request(server)
      .post('/posts')
      .set('Authorization', `Bearer ${authorToken}`)
      .send({ title: 'e2e 테스트 글', content: '댓글 달아주세요' })
      .expect(201);
    const postId = postRes.body.id;

    await request(server)
      .post(`/posts/${postId}/comments`)
      .set('Authorization', `Bearer ${commenterToken}`)
      .send({ content: 'e2e 댓글입니다' })
      .expect(201);

    const notificationsRes = await request(server)
      .get('/notifications?unreadOnly=true')
      .set('Authorization', `Bearer ${authorToken}`)
      .expect(200);

    expect(notificationsRes.body.unreadCount).toBeGreaterThanOrEqual(1);
    const matching = notificationsRes.body.items.find(
      (item: { post: { id: string } }) => item.post.id === postId,
    );
    expect(matching).toBeDefined();
    expect(matching.commentPreview).toBe('e2e 댓글입니다');
  });
});
