import { EntityManager } from 'typeorm';
import type { AuthenticatedUser } from '../auth/jwt-payload.interface';
import { Comment } from '../comments/comment.entity';
import { Post } from '../posts/post.entity';
import { Notification } from './notification.entity';
import { NotificationsGateway } from './notifications.gateway';
import { NotificationsService } from './notifications.service';

/**
 * S 티어 "핵심만" 단위 테스트 — 리포지토리 목으로 DB 없이 돈다(SPEC 4-2).
 * 알림 생성 규칙(SC-6)과 트랜잭션 원자성 전제(SC-8)를 고정한다.
 */
describe('NotificationsService', () => {
  const post = { id: 'post-1', authorId: 'author-1', title: '제목' } as Post;
  const comment = { id: 'comment-1', content: '댓글 내용' } as Comment;

  function buildService(): NotificationsService {
    const notificationsRepo = { count: jest.fn() } as any;
    const gateway = {
      notifyNew: jest.fn(),
      notifyRead: jest.fn(),
    } as unknown as NotificationsGateway;
    return new NotificationsService(notificationsRepo, gateway);
  }

  function buildManager(saveImpl: jest.Mock) {
    const notificationRepo = { create: jest.fn((x) => x), save: saveImpl };
    return {
      getRepository: jest.fn(() => notificationRepo),
    } as unknown as EntityManager;
  }

  describe('createForComment', () => {
    it('남의 글에 댓글을 달면 알림 1건을 생성한다', async () => {
      const service = buildService();
      const save = jest.fn(async (n) => ({
        ...n,
        id: 'notif-1',
        createdAt: new Date(),
      }));
      const manager = buildManager(save);
      const actor: AuthenticatedUser = {
        id: 'actor-1',
        email: 'a@test.com',
        nickname: 'A',
      };

      const result = await service.createForComment(manager, {
        post,
        comment,
        actor,
      });

      expect(save).toHaveBeenCalledTimes(1);
      expect(result).toMatchObject({
        recipientId: post.authorId,
        actorId: actor.id,
        postId: post.id,
        commentId: comment.id,
        type: 'COMMENT',
        isRead: false,
      });
    });

    it('자기 글에 자기가 댓글을 달면 알림을 생성하지 않는다(SC-6)', async () => {
      const service = buildService();
      const save = jest.fn();
      const manager = buildManager(save);
      const selfActor: AuthenticatedUser = {
        id: post.authorId,
        email: 'author@test.com',
        nickname: '글쓴이',
      };

      const result = await service.createForComment(manager, {
        post,
        comment,
        actor: selfActor,
      });

      expect(result).toBeNull();
      expect(save).not.toHaveBeenCalled();
    });

    it('알림 저장이 실패하면 예외를 그대로 전파한다 — 트랜잭션 롤백의 전제(SC-8)', async () => {
      const service = buildService();
      const save = jest.fn().mockRejectedValue(new Error('DB 저장 실패'));
      const manager = buildManager(save);
      const actor: AuthenticatedUser = {
        id: 'actor-1',
        email: 'a@test.com',
        nickname: 'A',
      };

      // createForComment는 호출부(CommentsService)가 DataSource.transaction 콜백 안에서
      // 호출한다. 여기서 예외가 삼켜지지 않고 전파되어야 콜백 전체가 reject되어
      // TypeORM이 댓글 INSERT까지 포함해 트랜잭션 전체를 롤백한다.
      await expect(
        service.createForComment(manager, { post, comment, actor }),
      ).rejects.toThrow('DB 저장 실패');
    });
  });
});
