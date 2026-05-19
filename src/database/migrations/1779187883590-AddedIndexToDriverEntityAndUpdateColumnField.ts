import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddedIndexToDriverEntityAndUpdateColumnField1779187883590 implements MigrationInterface {
  name = 'AddedIndexToDriverEntityAndUpdateColumnField1779187883590';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "drivers" ADD "updated_at" TIMESTAMP NOT NULL DEFAULT now()`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_drivers_dispatch" ON "drivers" ("online_status", "is_suspended", "current_latitude", "current_longitude") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_drivers_is_suspended" ON "drivers" ("is_suspended") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_drivers_online_status" ON "drivers" ("online_status") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_drivers_user_id" ON "drivers" ("user_id") `,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."idx_drivers_user_id"`);
    await queryRunner.query(`DROP INDEX "public"."idx_drivers_online_status"`);
    await queryRunner.query(`DROP INDEX "public"."idx_drivers_is_suspended"`);
    await queryRunner.query(`DROP INDEX "public"."idx_drivers_dispatch"`);
    await queryRunner.query(`ALTER TABLE "drivers" DROP COLUMN "updated_at"`);
  }
}
