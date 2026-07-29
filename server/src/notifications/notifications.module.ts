import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { NotificationsController } from './notifications.controller';
import { NotificationsGateway } from './notifications.gateway';
import { NotificationsService } from './notifications.service';
import { Notification } from './notification.entity';
import { UserSocketRegistry } from './user-socket.registry';

@Module({
  // AuthModule이 export하는 JwtModule에서 JwtService를 받아 소켓 인증 미들웨어에 쓴다
  // (REST 가드와 동일한 secret을 공유 — 토큰 하나로 REST/소켓 양쪽 인증).
  imports: [TypeOrmModule.forFeature([Notification]), AuthModule],
  controllers: [NotificationsController],
  providers: [NotificationsService, NotificationsGateway, UserSocketRegistry],
  exports: [NotificationsService],
})
export class NotificationsModule {}
