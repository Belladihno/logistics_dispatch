import {
  BeforeInsert,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { v7 as uuidv7 } from 'uuid';
import { User } from '../../users/entities/user.entity';
import { VehicleType } from '../enums/vehincle-type.enum';

@Entity('drivers')
@Index('idx_drivers_user_id', ['userId'])
@Index('idx_drivers_online_status', ['onlineStatus'])
@Index('idx_drivers_is_suspended', ['isSuspended'])
@Index('idx_drivers_dispatch', [
  'onlineStatus',
  'isSuspended',
  'currentLatitude',
  'currentLongitude',
])
export class Driver {
  @PrimaryColumn('uuid')
  id!: string;

  @OneToOne(() => User, { eager: false })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @Column({
    name: 'vehincle_type',
    type: 'enum',
    enum: VehicleType,
  })
  vehincleType!: VehicleType;

  @Column({ name: 'license_number', unique: true })
  licenseNumber!: string;

  @Column({ name: 'online_status', default: false })
  onlineStatus!: boolean;

  @Column({
    name: 'current_latitude',
    type: 'decimal',
    precision: 10,
    scale: 7,
    nullable: true,
  })
  currentLatitude?: number;

  @Column({
    name: 'current_longitude',
    type: 'decimal',
    precision: 10,
    scale: 7,
    nullable: true,
  })
  currentLongitude?: number;

  @Column({
    name: 'rating',
    type: 'decimal',
    precision: 3,
    scale: 2,
    default: 5.0,
  })
  rating!: number;

  @Column({ name: 'is_suspended', default: false })
  isSuspended!: boolean;

  @ManyToOne(() => User, { eager: false, nullable: true })
  @JoinColumn({ name: 'created_by' })
  createdBy?: User;

  @Column({ name: 'created_by', nullable: true })
  createdById?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @BeforeInsert()
  private beforeInsert(): void {
    if (!this.id) this.id = uuidv7();
  }
}
