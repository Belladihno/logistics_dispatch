import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateDriversTable1778711761946 implements MigrationInterface {
  name = 'CreateDriversTable1778711761946';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."drivers_vehincle_type_enum" AS ENUM('bike', 'car', 'van', 'truck')`,
    );
    await queryRunner.query(
      `CREATE TABLE "drivers" ("id" uuid NOT NULL, "user_id" uuid NOT NULL, "vehincle_type" "public"."drivers_vehincle_type_enum" NOT NULL, "license_number" character varying NOT NULL, "online_status" boolean NOT NULL DEFAULT false, "current_latitude" numeric(10,7), "current_longitude" numeric(10,7), "rating" numeric(3,2) NOT NULL DEFAULT '5', "is_suspended" boolean NOT NULL DEFAULT false, "created_by" uuid, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_47543bd8e5e11a094ded9a56e98" UNIQUE ("license_number"), CONSTRAINT "REL_8e224f1b8f05ace7cfc7c76d03" UNIQUE ("user_id"), CONSTRAINT "PK_92ab3fb69e566d3eb0cae896047" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "drivers" ADD CONSTRAINT "FK_8e224f1b8f05ace7cfc7c76d03b" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "drivers" ADD CONSTRAINT "FK_8f09a7f6e652466af236cc6b9d2" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "drivers" DROP CONSTRAINT "FK_8f09a7f6e652466af236cc6b9d2"`,
    );
    await queryRunner.query(
      `ALTER TABLE "drivers" DROP CONSTRAINT "FK_8e224f1b8f05ace7cfc7c76d03b"`,
    );
    await queryRunner.query(`DROP TABLE "drivers"`);
    await queryRunner.query(`DROP TYPE "public"."drivers_vehincle_type_enum"`);
  }
}
