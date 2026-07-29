import { ApiProperty } from '@nestjs/swagger';
import { Length } from 'class-validator';

export class CreateCommentDto {
  @ApiProperty({ example: '축하합니다!' })
  @Length(1, 1000)
  content: string;
}
