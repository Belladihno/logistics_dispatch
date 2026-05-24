import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddedOrderAndVehincleTypeToOrdersTable1779190469874 implements MigrationInterface {
  name = 'AddedOrderAndVehincleTypeToOrdersTable1779190469874';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."orders_order_type_enum" AS ENUM('person', 'package', 'goods_small', 'goods_large')`,
    );
    await queryRunner.query(
      `ALTER TABLE "orders" ADD "order_type" "public"."orders_order_type_enum" NOT NULL`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."orders_vehicle_type_enum" AS ENUM('bike', 'car', 'van', 'truck')`,
    );
    await queryRunner.query(
      `ALTER TABLE "orders" ADD "vehicle_type" "public"."orders_vehicle_type_enum" NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN "vehicle_type"`);
    await queryRunner.query(`DROP TYPE "public"."orders_vehicle_type_enum"`);
    await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN "order_type"`);
    await queryRunner.query(`DROP TYPE "public"."orders_order_type_enum"`);
  }
}
