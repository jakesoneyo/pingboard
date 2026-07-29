import { ApiProperty } from '@nestjs/swagger';
import { UserSummaryDto } from '../../auth/dto/auth-response.dto';

/** 게시글 상세의 댓글 목록 원소이자 `POST .../comments` 응답 형태(API.md 4~5장). */
export class CommentSummaryDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  content: string;

  @ApiProperty({ type: UserSummaryDto })
  author: UserSummaryDto;

  @ApiProperty()
  createdAt: string;
}
