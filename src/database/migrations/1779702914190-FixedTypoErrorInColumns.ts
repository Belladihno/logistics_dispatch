import { MigrationInterface, QueryRunner } from 'typeorm';

export class FixedTypoErrorInColumns1779702914190 implements MigrationInterface {
  name = 'FixedTypoErrorInColumns1779702914190';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "orders" RENAME COLUMN "vehicle_type" TO "vehincle_type"`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."orders_vehicle_type_enum" RENAME TO "orders_vehincle_type_enum"`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TYPE "public"."orders_vehincle_type_enum" RENAME TO "orders_vehicle_type_enum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "orders" RENAME COLUMN "vehincle_type" TO "vehicle_type"`,
    );
  }
}
