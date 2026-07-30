import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * B1 수정 — InitSchema가 `createdAt`(camelCase)으로 만든 4개 테이블의 생성시각 컬럼을
 * DATA-MODEL.md 2장이 명시하는 `created_at`(snake_case)으로 통일한다.
 *
 * 이미 실행된 InitSchema 마이그레이션은 손대지 않고(운영 히스토리 보존), 컬럼명만
 * `ALTER TABLE ... RENAME COLUMN`으로 바꾼다 — 인덱스는 컬럼에 종속되어 있어 Postgres가
 * 자동으로 새 이름을 따라가므로 별도 재생성이 필요 없다.
 */
export class RenameCreatedAtToSnakeCase1785354978552 implements MigrationInterface {
  name = 'RenameCreatedAtToSnakeCase1785354978552';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" RENAME COLUMN "createdAt" TO "created_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "posts" RENAME COLUMN "createdAt" TO "created_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "comments" RENAME COLUMN "createdAt" TO "created_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "notifications" RENAME COLUMN "createdAt" TO "created_at"`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "notifications" RENAME COLUMN "created_at" TO "createdAt"`,
    );
    await queryRunner.query(
      `ALTER TABLE "comments" RENAME COLUMN "created_at" TO "createdAt"`,
    );
    await queryRunner.query(
      `ALTER TABLE "posts" RENAME COLUMN "created_at" TO "createdAt"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" RENAME COLUMN "created_at" TO "createdAt"`,
    );
  }
}
