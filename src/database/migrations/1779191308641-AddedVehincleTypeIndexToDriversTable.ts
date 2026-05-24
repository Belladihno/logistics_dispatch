import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddedVehincleTypeIndexToDriversTable1779191308641 implements MigrationInterface {
  name = 'AddedVehincleTypeIndexToDriversTable1779191308641';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."idx_drivers_dispatch"`);
    await queryRunner.query(
      `CREATE INDEX "idx_drivers_dispatch" ON "drivers" ("online_status", "is_suspended", "vehincle_type", "current_latitude", "current_longitude") `,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."idx_drivers_dispatch"`);
    await queryRunner.query(
      `CREATE INDEX "idx_drivers_dispatch" ON "drivers" ("current_latitude", "current_longitude", "is_suspended", "online_status") `,
    );
  }
}
