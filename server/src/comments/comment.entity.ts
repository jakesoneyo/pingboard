import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../common/entities/base.entity';
import { Post } from '../posts/post.entity';
import { User } from '../users/user.entity';

/**
 * 댓글. `(post_id, created_at ASC)` 복합 인덱스(I3)로 상세 페이지의 댓글 목록을
 * 필터+정렬 모두 인덱스만으로 처리한다(DATA-MODEL 3장).
 */
@Entity('comments')
@Index(['postId', 'createdAt'])
export class Comment extends BaseEntity {
  @Column({ type: 'uuid', name: 'post_id' })
  postId: string;

  @ManyToOne(() => Post, { eager: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'post_id' })
  post: Post;

  @Column({ type: 'uuid', name: 'author_id' })
  authorId: string;

  @ManyToOne(() => User, { eager: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'author_id' })
  author: User;

  @Column({ type: 'text' })
  content: string;
}
