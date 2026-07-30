import { ApiProperty } from '@nestjs/swagger';
import { AuthorSummaryDto } from '../../auth/dto/auth-response.dto';
import type { NotificationType } from '../notification.entity';

/** REST(`GET /notifications`)와 소켓(`notification:new`)이 완전히 동일하게 공유하는 형태(API.md 7장). */
export class NotificationPostRefDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  title: string;
}

export class NotificationDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ example: 'COMMENT' })
  type: NotificationType;

  @ApiProperty()
  isRead: boolean;

  @ApiProperty()
  createdAt: string;

  @ApiProperty({ type: AuthorSummaryDto })
  actor: AuthorSummaryDto;

  @ApiProperty({ type: NotificationPostRefDto })
  post: NotificationPostRefDto;

  @ApiProperty()
  commentPreview: string;
}

export class NotificationsListResponseDto {
  @ApiProperty({ type: [NotificationDto] })
  items: NotificationDto[];

  @ApiProperty()
  unreadCount: number;
}

export class UnreadCountResponseDto {
  @ApiProperty()
  unreadCount: number;
}

export class MarkReadResponseDto {
  @ApiProperty()
  unreadCount: number;
}

export class MarkAllReadResponseDto {
  @ApiProperty({ type: [String] })
  updatedIds: string[];

  @ApiProperty()
  unreadCount: number;
}
