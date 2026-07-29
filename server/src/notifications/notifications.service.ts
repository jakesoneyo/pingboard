import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import type { AuthenticatedUser } from '../auth/jwt-payload.interface';
import { Comment } from '../comments/comment.entity';
import { Post } from '../posts/post.entity';
import {
  MarkAllReadResponseDto,
  MarkReadResponseDto,
  NotificationDto,
  NotificationsListResponseDto,
} from './dto/notification-response.dto';
import { NotificationsGateway } from './notifications.gateway';
import { Notification } from './notification.entity';

const COMMENT_PREVIEW_LENGTH = 50;

export interface ListOptions {
  unreadOnly: boolean;
  limit: number;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectRepository(Notification)
    private readonly notifications: Repository<Notification>,
    private readonly gateway: NotificationsGateway,
  ) {}

  /**
   * 댓글과 같은 트랜잭션 안에서 알림을 만든다(SC-8). 반드시 호출부(CommentsService)가
   * 넘긴 트랜잭션 매니저로 INSERT해야 댓글 저장 실패 시 알림도 함께 롤백된다.
   *
   * 자기 글에 자기가 댓글을 단 경우(`post.authorId === actor.id`)는 SC-6에 따라
   * 아무것도 하지 않고 `null`을 반환한다 — 알림 0건.
   */
  async createForComment(
    manager: EntityManager,
    {
      post,
      comment,
      actor,
    }: { post: Post; comment: Comment; actor: AuthenticatedUser },
  ): Promise<Notification | null> {
    if (post.authorId === actor.id) {
      return null;
    }

    return manager.getRepository(Notification).save(
      manager.getRepository(Notification).create({
        recipientId: post.authorId,
        actorId: actor.id,
        postId: post.id,
        commentId: comment.id,
        type: 'COMMENT',
        isRead: false,
      }),
    );
  }

  /**
   * 트랜잭션 커밋 이후에만 호출해야 한다(API.md 5장 순서 5번). 이미 필요한 관계
   * (post/actor/comment)를 호출부가 들고 있으므로 재조회 없이 DTO를 구성해 브로드캐스트한다.
   * 소켓 emit 실패는 삼켜서 댓글 작성 응답(201)에 영향을 주지 않는다.
   */
  async notifyCreated(
    notification: Notification,
    context: { post: Post; comment: Comment; actor: AuthenticatedUser },
  ): Promise<void> {
    try {
      const unreadCount = await this.countUnread(notification.recipientId);
      const dto: NotificationDto = {
        id: notification.id,
        type: notification.type,
        isRead: notification.isRead,
        createdAt: notification.createdAt.toISOString(),
        actor: {
          id: context.actor.id,
          email: context.actor.email,
          nickname: context.actor.nickname,
        },
        post: { id: context.post.id, title: context.post.title },
        commentPreview: context.comment.content.slice(
          0,
          COMMENT_PREVIEW_LENGTH,
        ),
      };
      this.gateway.notifyNew(notification.recipientId, dto, unreadCount);
    } catch (error) {
      this.logger.warn(`알림 emit 실패(무시): ${(error as Error).message}`);
    }
  }

  /** 재연결/로그인 시 재동기화의 주역(SC-2). I4 인덱스로 커버되는 조회. */
  async findMany(
    userId: string,
    { unreadOnly, limit }: ListOptions,
  ): Promise<NotificationsListResponseDto> {
    const qb = this.notifications
      .createQueryBuilder('n')
      .leftJoin('n.actor', 'actor')
      .addSelect(['actor.id', 'actor.email', 'actor.nickname'])
      .leftJoin('n.post', 'post')
      .addSelect(['post.id', 'post.title'])
      .leftJoin('n.comment', 'comment')
      .addSelect(['comment.id', 'comment.content'])
      .where('n.recipientId = :userId', { userId })
      .orderBy('n.createdAt', 'DESC')
      .take(limit);

    if (unreadOnly) {
      qb.andWhere('n.isRead = false');
    }

    const [rows, unreadCount] = await Promise.all([
      qb.getMany(),
      this.countUnread(userId),
    ]);

    const items: NotificationDto[] = rows.map((n) => ({
      id: n.id,
      type: n.type,
      isRead: n.isRead,
      createdAt: n.createdAt.toISOString(),
      actor: {
        id: n.actor.id,
        email: n.actor.email,
        nickname: n.actor.nickname,
      },
      post: { id: n.post.id, title: n.post.title },
      commentPreview: n.comment.content.slice(0, COMMENT_PREVIEW_LENGTH),
    }));

    return { items, unreadCount };
  }

  countUnread(userId: string): Promise<number> {
    return this.notifications.count({
      where: { recipientId: userId, isRead: false },
    });
  }

  /**
   * 소유권 검사 후 처리한다 — id만 알면 남의 알림을 읽음 처리할 수 있는 구멍을 막는다.
   * 이미 읽음이면 그대로 현재 unreadCount를 반환한다(멱등).
   * @throws NotFoundException 알림이 없을 때
   * @throws ForbiddenException 본인 소유가 아닐 때
   */
  async markRead(userId: string, id: string): Promise<MarkReadResponseDto> {
    const notification = await this.notifications.findOne({ where: { id } });
    if (!notification) {
      throw new NotFoundException('알림을 찾을 수 없습니다.');
    }
    if (notification.recipientId !== userId) {
      throw new ForbiddenException('본인의 알림만 읽음 처리할 수 있습니다.');
    }

    if (!notification.isRead) {
      notification.isRead = true;
      await this.notifications.save(notification);
    }

    const unreadCount = await this.countUnread(userId);
    this.gateway.notifyRead(userId, [id], unreadCount);
    return { unreadCount };
  }

  /** `UPDATE ... RETURNING id` 한 방으로 처리한다(루프 금지, API.md 6장). */
  async markAllRead(userId: string): Promise<MarkAllReadResponseDto> {
    const result = await this.notifications
      .createQueryBuilder()
      .update(Notification)
      .set({ isRead: true })
      .where('recipient_id = :userId AND is_read = false', { userId })
      .returning('id')
      .execute();

    const updatedIds: string[] = (result.raw as Array<{ id: string }>).map(
      (row) => row.id,
    );
    this.gateway.notifyRead(userId, updatedIds, 0);
    return { updatedIds, unreadCount: 0 };
  }
}
