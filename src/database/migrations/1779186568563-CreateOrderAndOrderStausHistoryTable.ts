import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateOrderAndOrderStausHistoryTable1779186568563 implements MigrationInterface {
  name = 'CreateOrderAndOrderStausHistoryTable1779186568563';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."order_status_history_previous_status_enum" AS ENUM('pending', 'driver_assigned', 'driver_arriving', 'picked_up', 'in_transit', 'delivered', 'cancelled', 'failed', 'expired')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."order_status_history_new_status_enum" AS ENUM('pending', 'driver_assigned', 'driver_arriving', 'picked_up', 'in_transit', 'delivered', 'cancelled', 'failed', 'expired')`,
    );
    await queryRunner.query(
      `CREATE TABLE "order_status_history" ("id" uuid NOT NULL, "order_id" uuid NOT NULL, "previous_status" "public"."order_status_history_previous_status_enum", "new_status" "public"."order_status_history_new_status_enum" NOT NULL, "actor_id" character varying NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_e6c66d853f155531985fc4f6ec8" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_order_status_history_order_id" ON "order_status_history" ("order_id") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."orders_order_status_enum" AS ENUM('pending', 'driver_assigned', 'driver_arriving', 'picked_up', 'in_transit', 'delivered', 'cancelled', 'failed', 'expired')`,
    );
    await queryRunner.query(
      `CREATE TABLE "orders" ("id" uuid NOT NULL, "customer_id" uuid NOT NULL, "pickup_address" text NOT NULL, "delivery_address" text NOT NULL, "pickup_latitude" numeric(10,7) NOT NULL, "pickup_longitude" numeric(10,7) NOT NULL, "delivery_latitude" numeric(10,7) NOT NULL, "delivery_longitude" numeric(10,7) NOT NULL, "order_status" "public"."orders_order_status_enum" NOT NULL DEFAULT 'pending', "assigned_driver_id" uuid, "estimated_price" numeric(10,2), "dispatch_attempts" integer NOT NULL DEFAULT '0', "attempted_driver_ids" text NOT NULL DEFAULT '', "version" integer NOT NULL DEFAULT '1', "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP, CONSTRAINT "PK_710e2d4957aa5878dfe94e4ac2f" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_orders_created_at" ON "orders" ("created_at") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_orders_status" ON "orders" ("order_status") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_orders_assigned_driver_id" ON "orders" ("assigned_driver_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_orders_customer_id" ON "orders" ("customer_id") `,
    );
    await queryRunner.query(
      `ALTER TABLE "order_status_history" ADD CONSTRAINT "FK_1ca7d5228cf9dc589b60243933c" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "orders" ADD CONSTRAINT "FK_772d0ce0473ac2ccfa26060dbe9" FOREIGN KEY ("customer_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "orders" ADD CONSTRAINT "FK_f7e3aa789f0edeea79656a47426" FOREIGN KEY ("assigned_driver_id") REFERENCES "drivers"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "orders" DROP CONSTRAINT "FK_f7e3aa789f0edeea79656a47426"`,
    );
    await queryRunner.query(
      `ALTER TABLE "orders" DROP CONSTRAINT "FK_772d0ce0473ac2ccfa26060dbe9"`,
    );
    await queryRunner.query(
      `ALTER TABLE "order_status_history" DROP CONSTRAINT "FK_1ca7d5228cf9dc589b60243933c"`,
    );
    await queryRunner.query(`DROP INDEX "public"."idx_orders_customer_id"`);
    await queryRunner.query(
      `DROP INDEX "public"."idx_orders_assigned_driver_id"`,
    );
    await queryRunner.query(`DROP INDEX "public"."idx_orders_status"`);
    await queryRunner.query(`DROP INDEX "public"."idx_orders_created_at"`);
    await queryRunner.query(`DROP TABLE "orders"`);
    await queryRunner.query(`DROP TYPE "public"."orders_order_status_enum"`);
    await queryRunner.query(
      `DROP INDEX "public"."idx_order_status_history_order_id"`,
    );
    await queryRunner.query(`DROP TABLE "order_status_history"`);
    await queryRunner.query(
      `DROP TYPE "public"."order_status_history_new_status_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."order_status_history_previous_status_enum"`,
    );
  }
}
