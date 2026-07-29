import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { CommentsModule } from './comments/comments.module';
import { buildTypeOrmConfig } from './config/typeorm.config';
import { HealthModule } from './health/health.module';
import { NotificationsModule } from './notifications/notifications.module';
import { PostsModule } from './posts/posts.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) =>
        buildTypeOrmConfig(configService.getOrThrow<string>('DATABASE_URL')),
    }),
    HealthModule,
    AuthModule,
    PostsModule,
    CommentsModule,
    NotificationsModule,
  ],
})
export class AppModule {}
