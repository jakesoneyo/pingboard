/**
 * 데모 데이터 시드(멱등). `admin` 계정이 이미 있으면 아무것도 하지 않고 종료한다
 * (DATA-MODEL 4-3). 운영 DB 오염을 막기 위해 CI에서는 이 스크립트를 실행하지 않는다.
 *
 * 비밀번호는 admin을 포함해 전부 정상 bcrypt 해시 경로를 탄다 — 인증 우회 없음.
 * 실행: `npm run seed`
 */
import * as bcrypt from 'bcrypt';
import dataSource from '../src/config/data-source';
import { Comment } from '../src/comments/comment.entity';
import { Notification } from '../src/notifications/notification.entity';
import { Post } from '../src/posts/post.entity';
import { User } from '../src/users/user.entity';

const BCRYPT_COST = 10;

async function main(): Promise<void> {
  await dataSource.initialize();

  const users = dataSource.getRepository(User);
  const posts = dataSource.getRepository(Post);
  const comments = dataSource.getRepository(Comment);
  const notifications = dataSource.getRepository(Notification);

  const existingAdmin = await users.findOne({ where: { email: 'admin' } });
  if (existingAdmin) {
    console.log('admin 계정이 이미 존재합니다 — 시드를 스킵합니다.');
    await dataSource.destroy();
    return;
  }

  const admin = await users.save(
    users.create({
      email: 'admin',
      nickname: '데모관리자',
      passwordHash: await bcrypt.hash('admin', BCRYPT_COST),
    }),
  );
  const demo1 = await users.save(
    users.create({
      email: 'demo1@pingboard.dev',
      nickname: 'demo1',
      passwordHash: await bcrypt.hash('demo1234', BCRYPT_COST),
    }),
  );
  const demo2 = await users.save(
    users.create({
      email: 'demo2@pingboard.dev',
      nickname: 'demo2',
      passwordHash: await bcrypt.hash('demo1234', BCRYPT_COST),
    }),
  );

  const [p1, p2] = await posts.save([
    posts.create({
      authorId: admin.id,
      title: '실시간 알림 테스트',
      content: '이 글에 댓글을 달아보세요. 알림이 실시간으로 옵니다.',
    }),
    posts.create({
      authorId: admin.id,
      title: 'pingboard에 오신 것을 환영합니다',
      content: '이 게시판은 실시간 알림함 데모를 위한 최소한의 그릇입니다.',
    }),
    posts.create({
      authorId: admin.id,
      title: '세 번째 글',
      content: '목록 화면 확인용 샘플 글입니다.',
    }),
  ]);
  await posts.save([
    posts.create({
      authorId: demo1.id,
      title: 'demo1의 글',
      content: 'demo1이 작성한 샘플 글입니다.',
    }),
    posts.create({
      authorId: demo2.id,
      title: 'demo2의 글',
      content: 'demo2가 작성한 샘플 글입니다.',
    }),
  ]);

  // admin 소유 글(p1, p2)에 보조 유저들이 단 댓글 — 알림의 recipient는 항상 admin.
  const [c1, c2, c3, c4] = await comments.save([
    comments.create({
      postId: p1.id,
      authorId: demo1.id,
      content: '좋은 글이네요!',
    }),
    comments.create({
      postId: p1.id,
      authorId: demo2.id,
      content: '저도 동의합니다.',
    }),
    comments.create({
      postId: p2.id,
      authorId: demo1.id,
      content: '환영합니다!',
    }),
    comments.create({
      postId: p2.id,
      authorId: demo2.id,
      content: '잘 보고 갑니다.',
    }),
  ]);

  // 로그인 직후 뱃지가 2로 보이도록 미읽음 2건 + 읽음 2건을 남긴다.
  await notifications.save([
    notifications.create({
      recipientId: admin.id,
      actorId: demo1.id,
      postId: p1.id,
      commentId: c1.id,
      type: 'COMMENT',
      isRead: false,
    }),
    notifications.create({
      recipientId: admin.id,
      actorId: demo2.id,
      postId: p1.id,
      commentId: c2.id,
      type: 'COMMENT',
      isRead: false,
    }),
    notifications.create({
      recipientId: admin.id,
      actorId: demo1.id,
      postId: p2.id,
      commentId: c3.id,
      type: 'COMMENT',
      isRead: true,
    }),
    notifications.create({
      recipientId: admin.id,
      actorId: demo2.id,
      postId: p2.id,
      commentId: c4.id,
      type: 'COMMENT',
      isRead: true,
    }),
  ]);

  console.log(
    '시드 완료: admin/admin (미읽음 알림 2건), demo1@pingboard.dev / demo2@pingboard.dev (비밀번호: demo1234)',
  );
  await dataSource.destroy();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
