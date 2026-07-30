import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import type { AuthenticatedUser } from '../auth/jwt-payload.interface';
import { NotificationsService } from '../notifications/notifications.service';
import { Post } from '../posts/post.entity';
import { Comment } from './comment.entity';
import { CommentSummaryDto } from './dto/comment-response.dto';
import { CreateCommentDto } from './dto/create-comment.dto';

@Injectable()
export class CommentsService {
  constructor(
    @InjectRepository(Post) private readonly posts: Repository<Post>,
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly notificationsService: NotificationsService,
  ) {}

  /**
   * 댓글 작성의 유일한 진입점이자 이 프로젝트에서 유일하게 부수효과(알림 생성 +
   * 소켓 브로드캐스트)를 갖는 동작(API.md 5장). 서버 동작 순서를 그대로 따른다:
   *
   * 1. 게시글 존재 확인 → 2. 트랜잭션 내 댓글 INSERT → 3. 자기 글이 아니면 알림 INSERT
   * → 4. 커밋 → 5. 커밋 이후에만 소켓 emit → 6. 201 응답.
   *
   * @throws NotFoundException 게시글이 없을 때
   */
  async create(
    postId: string,
    dto: CreateCommentDto,
    actor: AuthenticatedUser,
  ): Promise<CommentSummaryDto> {
    const post = await this.posts.findOne({ where: { id: postId } });
    if (!post) {
      throw new NotFoundException('게시글을 찾을 수 없습니다.');
    }

    // 트랜잭션 매니저를 NotificationsService에 그대로 넘겨 댓글+알림을 한 트랜잭션으로 묶는다(SC-8).
    const { comment, notification } = await this.dataSource.transaction(
      async (manager) => {
        const savedComment = await manager.getRepository(Comment).save(
          manager.getRepository(Comment).create({
            postId: post.id,
            authorId: actor.id,
            content: dto.content,
          }),
        );

        const savedNotification =
          await this.notificationsService.createForComment(manager, {
            post,
            comment: savedComment,
            actor,
          });

        return { comment: savedComment, notification: savedNotification };
      },
    );

    // 커밋 성공 이후에만 emit — 롤백 시 존재하지 않는 알림이 화면에 뜨는 것을 막는다.
    if (notification) {
      await this.notificationsService.notifyCreated(notification, {
        post,
        comment,
        actor,
      });
    }

    return {
      id: comment.id,
      content: comment.content,
      author: { id: actor.id, nickname: actor.nickname },
      createdAt: comment.createdAt.toISOString(),
    };
  }
}
