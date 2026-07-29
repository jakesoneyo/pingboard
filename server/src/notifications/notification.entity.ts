import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../common/entities/base.entity';
import { Comment } from '../comments/comment.entity';
import { Post } from '../posts/post.entity';
import { User } from '../users/user.entity';

/** 현재 지원하는 알림 종류. SPEC 2-2에 따라 `COMMENT` 1종만 존재한다. */
export type NotificationType = 'COMMENT';

/**
 * 알림. 이 프로젝트의 핵심 테이블.
 *
 * `type`을 Postgres enum이 아닌 varchar로 둔 이유(DATA-MODEL 2-4): enum 값 추가마다
 * `ALTER TYPE` 마이그레이션이 필요해 값이 1종뿐인 현재는 얻는 게 없다. TS union으로 좁힌다.
 *
 * I4 복합 인덱스 `(recipient_id, is_read, created_at DESC)`는 미읽음 목록 조회와
 * 카운트 두 쿼리를 모두 커버한다 — 컬럼 순서 근거는 DATA-MODEL 3-1 참고.
 */
@Entity('notifications')
@Index(['recipientId', 'isRead', 'createdAt'])
export class Notification extends BaseEntity {
  @Column({ type: 'uuid', name: 'recipient_id' })
  recipientId: string;

  @ManyToOne(() => User, { eager: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'recipient_id' })
  recipient: User;

  @Column({ type: 'uuid', name: 'actor_id' })
  actorId: string;

  @ManyToOne(() => User, { eager: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'actor_id' })
  actor: User;

  @Column({ type: 'uuid', name: 'post_id' })
  postId: string;

  @ManyToOne(() => Post, { eager: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'post_id' })
  post: Post;

  @Column({ type: 'uuid', name: 'comment_id' })
  commentId: string;

  @ManyToOne(() => Comment, { eager: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'comment_id' })
  comment: Comment;

  @Column({ type: 'varchar', length: 20, default: 'COMMENT' })
  type: NotificationType;

  @Column({ type: 'boolean', name: 'is_read', default: false })
  isRead: boolean;
}
