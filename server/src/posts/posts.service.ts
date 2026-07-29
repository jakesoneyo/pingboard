import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { AuthenticatedUser } from '../auth/jwt-payload.interface';
import { CreatePostDto } from './dto/create-post.dto';
import { ListPostsQueryDto } from './dto/list-posts-query.dto';
import {
  PaginatedPostsDto,
  PostDetailDto,
  PostListItemDto,
} from './dto/post-response.dto';
import { Post } from './post.entity';

@Injectable()
export class PostsService {
  constructor(
    @InjectRepository(Post) private readonly posts: Repository<Post>,
  ) {}

  /**
   * 목록 화면. 작성자는 `leftJoin`, 댓글 수는 `loadRelationCountAndMap`으로 붙여
   * 글 N개당 쿼리가 늘어나는 N+1을 피한다(DATA-MODEL 3-2) — 총 쿼리 2개 이내(목록+count).
   */
  async list(query: ListPostsQueryDto): Promise<PaginatedPostsDto> {
    const { page, limit } = query;

    const [rows, total] = await this.posts
      .createQueryBuilder('post')
      .leftJoin('post.author', 'author')
      .addSelect(['author.id', 'author.nickname', 'author.email'])
      .loadRelationCountAndMap('post.commentCount', 'post.comments')
      .orderBy('post.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    const items: PostListItemDto[] = rows.map((post) => ({
      id: post.id,
      title: post.title,
      author: {
        id: post.author.id,
        email: post.author.email,
        nickname: post.author.nickname,
      },
      // loadRelationCountAndMap이 런타임에 채우는 필드라 엔티티 타입엔 없다.
      commentCount: (post as unknown as { commentCount: number }).commentCount,
      createdAt: post.createdAt.toISOString(),
    }));

    return { items, total, page, limit };
  }

  /**
   * 상세 화면. 댓글+작성자를 한 번의 `leftJoinAndSelect` 체인으로 가져와
   * 댓글 N개당 작성자 조회가 발생하는 N+1을 피한다(DATA-MODEL 3-2).
   * @throws NotFoundException 게시글이 없을 때
   */
  async findOne(id: string): Promise<PostDetailDto> {
    const post = await this.posts
      .createQueryBuilder('post')
      .leftJoinAndSelect('post.author', 'author')
      .leftJoinAndSelect('post.comments', 'comment')
      .leftJoinAndSelect('comment.author', 'commentAuthor')
      .where('post.id = :id', { id })
      .orderBy('comment.createdAt', 'ASC')
      .getOne();

    if (!post) {
      throw new NotFoundException('게시글을 찾을 수 없습니다.');
    }

    return this.toDetailDto(post);
  }

  async create(
    dto: CreatePostDto,
    author: AuthenticatedUser,
  ): Promise<PostDetailDto> {
    const saved = await this.posts.save(
      this.posts.create({
        title: dto.title,
        content: dto.content,
        authorId: author.id,
      }),
    );
    // 방금 만든 글이므로 댓글이 없다 — 재조회 없이 바로 응답을 구성한다.
    return {
      id: saved.id,
      title: saved.title,
      content: saved.content,
      author: { id: author.id, email: author.email, nickname: author.nickname },
      createdAt: saved.createdAt.toISOString(),
      comments: [],
    };
  }

  /** 존재 여부만 필요한 호출(댓글 작성 시)을 위한 경량 조회. */
  async findAuthorId(postId: string): Promise<string> {
    const post = await this.posts.findOne({
      where: { id: postId },
      select: ['id', 'authorId'],
    });
    if (!post) {
      throw new NotFoundException('게시글을 찾을 수 없습니다.');
    }
    return post.authorId;
  }

  private toDetailDto(post: Post): PostDetailDto {
    return {
      id: post.id,
      title: post.title,
      content: post.content,
      author: {
        id: post.author.id,
        email: post.author.email,
        nickname: post.author.nickname,
      },
      createdAt: post.createdAt.toISOString(),
      comments: (post.comments ?? []).map((comment) => ({
        id: comment.id,
        content: comment.content,
        author: {
          id: comment.author.id,
          email: comment.author.email,
          nickname: comment.author.nickname,
        },
        createdAt: comment.createdAt.toISOString(),
      })),
    };
  }
}
