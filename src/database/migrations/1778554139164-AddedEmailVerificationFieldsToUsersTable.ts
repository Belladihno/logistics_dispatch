import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddedEmailVerificationFieldsToUsersTable1778554139164 implements MigrationInterface {
  name = 'AddedEmailVerificationFieldsToUsersTable1778554139164';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ADD "is_email_verified" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD "email_verification_token_hash" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD "email_verification_expires_at" TIMESTAMP WITH TIME ZONE`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD "email_verified_at" TIMESTAMP WITH TIME ZONE`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN "email_verified_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN "email_verification_expires_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN "email_verification_token_hash"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN "is_email_verified"`,
    );
  }
}
