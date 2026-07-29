import { config } from 'dotenv';
import { DataSource } from 'typeorm';
import { isSslRequiredHost } from './ssl.util';

// 마이그레이션 CLI(typeorm-ts-node-commonjs)는 Nest 부트스트랩을 거치지 않으므로
// .env를 직접 로드해야 한다.
config();

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error(
    'DATABASE_URL이 설정되지 않았습니다. server/.env를 확인하세요.',
  );
}

const host = new URL(databaseUrl).hostname;

/**
 * TypeORM CLI 전용 DataSource. 런타임 설정(typeorm.config.ts)과 동일한
 * `isSslRequiredHost` 헬퍼를 공유해, 한쪽 경로에만 SSL 판별이 있어서 CLI만
 * 실패하는 사고(newGym)를 예방한다.
 */
export default new DataSource({
  type: 'postgres',
  url: databaseUrl,
  entities: [__dirname + '/../**/*.entity{.ts,.js}'],
  migrations: [__dirname + '/../../migrations/*{.ts,.js}'],
  ssl: isSslRequiredHost(host) ? { rejectUnauthorized: false } : false,
});
