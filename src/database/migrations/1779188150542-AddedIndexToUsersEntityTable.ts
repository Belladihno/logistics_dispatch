import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddedIndexToUsersEntityTable1779188150542 implements MigrationInterface {
  name = 'AddedIndexToUsersEntityTable1779188150542';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE INDEX "idx_users_email_provider" ON "users" ("email", "provider") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_users_google_id" ON "users" ("google_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_users_role" ON "users" ("role") `,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."idx_users_role"`);
    await queryRunner.query(`DROP INDEX "public"."idx_users_google_id"`);
    await queryRunner.query(`DROP INDEX "public"."idx_users_email_provider"`);
  }
}
