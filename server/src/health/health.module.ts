import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';

/** `GET /health` — 배포 플랫폼 헬스체크용, DB ping 포함. */
@Module({
  controllers: [HealthController],
})
export class HealthModule {}
