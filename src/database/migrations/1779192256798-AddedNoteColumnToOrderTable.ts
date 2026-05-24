import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddedNoteColumnToOrderTable1779192256798 implements MigrationInterface {
  name = 'AddedNoteColumnToOrderTable1779192256798';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "orders" ADD "notes" text`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN "notes"`);
  }
}
