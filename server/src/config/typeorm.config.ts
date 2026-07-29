import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { User } from '../users/user.entity';
import { Post } from '../posts/post.entity';
import { Comment } from '../comments/comment.entity';
import { Notification } from '../notifications/notification.entity';
import { isSslRequiredHost } from './ssl.util';

/**
 * 앱 런타임에서 쓰는 TypeORM 설정. `synchronize: false`로 고정하고 스키마 변경은
 * 100% 마이그레이션 파일로만 한다(DATA-MODEL 4-1) — newGym에서 겪은 "마이그레이션이
 * 빈 DB를 전제하지 못해 실패" 사고를 반복하지 않기 위함.
 *
 * @param databaseUrl `.env`의 `DATABASE_URL`
 * @returns `TypeOrmModule.forRoot`에 그대로 넘길 수 있는 옵션 객체
 */
export function buildTypeOrmConfig(databaseUrl: string): TypeOrmModuleOptions {
  const host = new URL(databaseUrl).hostname;

  return {
    type: 'postgres',
    url: databaseUrl,
    entities: [User, Post, Comment, Notification],
    synchronize: false,
    migrationsRun: false,
    logging: process.env.NODE_ENV === 'development' ? ['query'] : false,
    ssl: isSslRequiredHost(host) ? { rejectUnauthorized: false } : false,
    // Neon 무료 티어 커넥션 한도를 고려해 인스턴스 1개 기준으로 충분한 값으로 제한(DATA-MODEL 4-2).
    extra: { max: 5 },
  };
}
