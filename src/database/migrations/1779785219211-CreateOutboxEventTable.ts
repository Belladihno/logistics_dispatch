import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateOutboxEventTable1779785219211 implements MigrationInterface {
  name = 'CreateOutboxEventTable1779785219211';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "outbox_events" ("id" uuid NOT NULL, "event_type" character varying NOT NULL, "payload" jsonb NOT NULL, "status" character varying(32) NOT NULL, "attempts" integer NOT NULL DEFAULT '0', "last_error" text, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "processed_at" TIMESTAMP, CONSTRAINT "PK_6689a16c00d09b8089f6237f1d2" PRIMARY KEY ("id"))`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "outbox_events"`);
  }
}
