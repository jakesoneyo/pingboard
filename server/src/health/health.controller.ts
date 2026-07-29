import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  /**
   * 배포 플랫폼(Render 등)의 헬스체크 대상. DB까지 살아있는지 실제 쿼리로 ping해
   * "프로세스는 떠 있지만 DB 연결이 죽은" 상태를 조기에 드러낸다.
   */
  @Get()
  async check(): Promise<{ status: string; db: string; uptime: number }> {
    let db = 'up';
    try {
      await this.dataSource.query('SELECT 1');
    } catch {
      db = 'down';
    }
    return { status: 'ok', db, uptime: process.uptime() };
  }
}
