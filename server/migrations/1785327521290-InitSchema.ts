import { MigrationInterface, QueryRunner } from "typeorm";

export class InitSchema1785327521290 implements MigrationInterface {
    name = 'InitSchema1785327521290'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "users" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "email" character varying(255) NOT NULL, "nickname" character varying(30) NOT NULL, "password_hash" character varying(60) NOT NULL, CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email"), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "comments" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "post_id" uuid NOT NULL, "author_id" uuid NOT NULL, "content" text NOT NULL, CONSTRAINT "PK_8bf68bc960f2b69e818bdb90dcb" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_ecfc7ec2fed7041ad323d77109" ON "comments" ("post_id", "createdAt") `);
        await queryRunner.query(`CREATE TABLE "posts" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "author_id" uuid NOT NULL, "title" character varying(120) NOT NULL, "content" text NOT NULL, CONSTRAINT "PK_2829ac61eff60fcec60d7274b9e" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_46bc204f43827b6f25e0133dbf" ON "posts" ("createdAt") `);
        await queryRunner.query(`CREATE TABLE "notifications" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "recipient_id" uuid NOT NULL, "actor_id" uuid NOT NULL, "post_id" uuid NOT NULL, "comment_id" uuid NOT NULL, "type" character varying(20) NOT NULL DEFAULT 'COMMENT', "is_read" boolean NOT NULL DEFAULT false, CONSTRAINT "PK_6a72c3c0f683f6462415e653c3a" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_8b1d64cb21129301115ee414d3" ON "notifications" ("recipient_id", "is_read", "createdAt") `);
        await queryRunner.query(`ALTER TABLE "comments" ADD CONSTRAINT "FK_259bf9825d9d198608d1b46b0b5" FOREIGN KEY ("post_id") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "comments" ADD CONSTRAINT "FK_e6d38899c31997c45d128a8973b" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "posts" ADD CONSTRAINT "FK_312c63be865c81b922e39c2475e" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "notifications" ADD CONSTRAINT "FK_5332a4daa46fd3f4e6625dd275d" FOREIGN KEY ("recipient_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "notifications" ADD CONSTRAINT "FK_20f8b51fd9655c0b69feed5efc6" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "notifications" ADD CONSTRAINT "FK_ec240232d5de44495354f66e053" FOREIGN KEY ("post_id") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "notifications" ADD CONSTRAINT "FK_e20313cbf1dacbb2abc5bd66d26" FOREIGN KEY ("comment_id") REFERENCES "comments"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "notifications" DROP CONSTRAINT "FK_e20313cbf1dacbb2abc5bd66d26"`);
        await queryRunner.query(`ALTER TABLE "notifications" DROP CONSTRAINT "FK_ec240232d5de44495354f66e053"`);
        await queryRunner.query(`ALTER TABLE "notifications" DROP CONSTRAINT "FK_20f8b51fd9655c0b69feed5efc6"`);
        await queryRunner.query(`ALTER TABLE "notifications" DROP CONSTRAINT "FK_5332a4daa46fd3f4e6625dd275d"`);
        await queryRunner.query(`ALTER TABLE "posts" DROP CONSTRAINT "FK_312c63be865c81b922e39c2475e"`);
        await queryRunner.query(`ALTER TABLE "comments" DROP CONSTRAINT "FK_e6d38899c31997c45d128a8973b"`);
        await queryRunner.query(`ALTER TABLE "comments" DROP CONSTRAINT "FK_259bf9825d9d198608d1b46b0b5"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_8b1d64cb21129301115ee414d3"`);
        await queryRunner.query(`DROP TABLE "notifications"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_46bc204f43827b6f25e0133dbf"`);
        await queryRunner.query(`DROP TABLE "posts"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_ecfc7ec2fed7041ad323d77109"`);
        await queryRunner.query(`DROP TABLE "comments"`);
        await queryRunner.query(`DROP TABLE "users"`);
    }

}
