import {
  BeforeInsert,
  BeforeUpdate,
  Column,
  CreateDateColumn,
  Entity,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { v7 as uuidv7 } from 'uuid';
import { UserRole } from '../enums/user-role.enum';
import { AuthProvider } from '../../auth/enums/auth-provider';

@Entity('users')
export class User {
  @PrimaryColumn('uuid')
  id!: string;

  @Column({ length: 255 })
  name!: string;

  @Column({ unique: true })
  email!: string;

  @Column({ name: 'password_hash', nullable: true, select: false })
  passwordHash?: string;

  @Column({ type: 'enum', enum: UserRole, default: UserRole.CUSTOMER })
  role!: UserRole;

  @Column({ name: 'google_id', nullable: true, unique: true })
  googleId?: string;

  @Column({ type: 'enum', enum: AuthProvider, default: AuthProvider.LOCAL })
  provider!: AuthProvider;

  @Column({ name: 'is_email_verified', default: false })
  isEmailVerified!: boolean;

  @Column({
    name: 'email_verification_token_hash',
    type: 'varchar',
    nullable: true,
    select: false,
  })
  emailVerificationTokenHash?: string | null;

  @Column({
    name: 'email_verification_expires_at',
    type: 'timestamptz',
    nullable: true,
  })
  emailVerificationExpiresAt?: Date | null;

  @Column({ name: 'email_verified_at', type: 'timestamptz', nullable: true })
  emailVerifiedAt?: Date | null;

  @Column({
    name: 'password_reset_token_hash',
    type: 'varchar',
    nullable: true,
    select: false,
  })
  passwordResetTokenHash?: string | null;

  @Column({
    name: 'password_reset_expires_at',
    type: 'timestamptz',
    nullable: true,
  })
  passwordResetExpiresAt?: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @BeforeInsert()
  private beforeInsert(): void {
    if (!this.id) this.id = uuidv7();
    this.email = this.email.toLowerCase().trim();
  }

  @BeforeUpdate()
  private beforeUpdate(): void {
    this.email = this.email.toLowerCase().trim();
  }
}
