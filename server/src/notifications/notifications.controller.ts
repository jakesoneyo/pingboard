import {
  Controller,
  Get,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { AuthenticatedUser } from '../auth/jwt-payload.interface';
import { ListNotificationsQueryDto } from './dto/list-notifications-query.dto';
import {
  MarkAllReadResponseDto,
  MarkReadResponseDto,
  NotificationsListResponseDto,
  UnreadCountResponseDto,
} from './dto/notification-response.dto';
import { NotificationsService } from './notifications.service';

/** 재연결/로그인 시 REST 재동기화(SC-2)의 주역이자 알림함의 유일한 쓰기 경로. */
@ApiTags('notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  findMany(
    @Query() query: ListNotificationsQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<NotificationsListResponseDto> {
    return this.notificationsService.findMany(user.id, {
      unreadOnly: query.unreadOnly,
      limit: query.limit,
    });
  }

  @Get('unread-count')
  async unreadCount(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<UnreadCountResponseDto> {
    const count = await this.notificationsService.countUnread(user.id);
    return { unreadCount: count };
  }

  @Patch(':id/read')
  markRead(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<MarkReadResponseDto> {
    return this.notificationsService.markRead(user.id, id);
  }

  @Patch('read-all')
  markAllRead(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<MarkAllReadResponseDto> {
    return this.notificationsService.markAllRead(user.id);
  }
}
