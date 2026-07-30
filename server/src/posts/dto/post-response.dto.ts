import { ApiProperty } from '@nestjs/swagger';
import { AuthorSummaryDto } from '../../auth/dto/auth-response.dto';
import { CommentSummaryDto } from '../../comments/dto/comment-response.dto';

/** `GET /posts` 목록 아이템 — 본문(`content`)은 절대 포함하지 않는다(API.md 4장). */
export class PostListItemDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  title: string;

  @ApiProperty({ type: AuthorSummaryDto })
  author: AuthorSummaryDto;

  @ApiProperty()
  commentCount: number;

  @ApiProperty()
  createdAt: string;
}

export class PaginatedPostsDto {
  @ApiProperty({ type: [PostListItemDto] })
  items: PostListItemDto[];

  @ApiProperty()
  total: number;

  @ApiProperty()
  page: number;

  @ApiProperty()
  limit: number;
}

/** `GET /posts/:id`, `POST /posts` 응답. */
export class PostDetailDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  title: string;

  @ApiProperty()
  content: string;

  @ApiProperty({ type: AuthorSummaryDto })
  author: AuthorSummaryDto;

  @ApiProperty()
  createdAt: string;

  @ApiProperty({ type: [CommentSummaryDto] })
  comments: CommentSummaryDto[];
}
