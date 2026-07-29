import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
} from 'typeorm';
import { BaseEntity } from '../common/entities/base.entity';
import { Comment } from '../comments/comment.entity';
import { User } from '../users/user.entity';

/**
 * 게시글. `created_at DESC` 인덱스(I2)는 목록 최신순 정렬 전용이다.
 * 관계는 `eager: false` — 목록/상세 각 서비스가 필요한 조인만 명시적으로 건다(N+1 방지).
 */
@Entity('posts')
@Index(['createdAt'])
export class Post extends BaseEntity {
  @Column({ type: 'uuid', name: 'author_id' })
  authorId: string;

  @ManyToOne(() => User, { eager: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'author_id' })
  author: User;

  @Column({ type: 'varchar', length: 120 })
  title: string;

  @Column({ type: 'text' })
  content: string;

  // 상세 조회의 `leftJoinAndSelect('post.comments', ...)`가 참조하는 역방향 관계.
  @OneToMany(() => Comment, (comment) => comment.post)
  comments: Comment[];
}
