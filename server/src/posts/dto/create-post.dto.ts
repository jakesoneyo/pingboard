import { ApiProperty } from '@nestjs/swagger';
import { Length } from 'class-validator';

export class CreatePostDto {
  @ApiProperty({ example: '실시간 알림 테스트' })
  @Length(1, 120)
  title: string;

  @ApiProperty({ example: '댓글 달아주세요' })
  @Length(1, 5000)
  content: string;
}
