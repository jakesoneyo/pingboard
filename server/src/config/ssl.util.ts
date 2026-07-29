/**
 * DB 접속 SSL 여부 판별 공용 헬퍼.
 *
 * 런타임 설정(typeorm.config.ts)과 CLI DataSource(data-source.ts)가 이 함수 하나를
 * 공유한다. newGym 프로젝트에서 한쪽 경로에만 SSL 판별 로직을 넣어 CLI 마이그레이션만
 * 실패했던 사고가 있었다 — 같은 실수를 반복하지 않기 위해 판별 로직을 한 곳으로 모은다.
 *
 * @param host DATABASE_URL에서 파싱한 호스트명
 * @returns localhost/127.0.0.1이 아니면 SSL이 필요하다고 판단(Neon 등 클라우드 Postgres 전제)
 */
export function isSslRequiredHost(host: string): boolean {
  return host !== 'localhost' && host !== '127.0.0.1';
}
