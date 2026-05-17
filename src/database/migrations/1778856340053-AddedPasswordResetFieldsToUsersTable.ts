import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddedPasswordResetFieldsToUsersTable1778856340053 implements MigrationInterface {
  name = 'AddedPasswordResetFieldsToUsersTable1778856340053';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ADD "password_reset_token_hash" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD "password_reset_expires_at" TIMESTAMP WITH TIME ZONE`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN "password_reset_expires_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN "password_reset_token_hash"`,
    );
  }
}
