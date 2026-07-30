import { CreateDateColumn, PrimaryColumn } from 'typeorm';

/**
 * 모든 엔티티가 공유하는 uuid PK + 생성시각.
 *
 * `@PrimaryGeneratedColumn('uuid')`는 Postgres에서 기본적으로 `uuid_generate_v4()`를 써서
 * `uuid-ossp` 확장 설치를 요구한다. PG13+ 내장 함수인 `gen_random_uuid()`를 명시적으로
 * 지정해 확장 설치 자체가 필요 없게 한다(DATA-MODEL 2-1 — newGym에서 겪은 확장 설치 사고 예방).
 */
export abstract class BaseEntity {
  @PrimaryColumn('uuid', { default: () => 'gen_random_uuid()' })
  id: string;

  // DATA-MODEL 2장이 전 테이블 공통으로 snake_case 컬럼명을 명시하므로 명시적으로 오버라이드한다.
  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;
}
