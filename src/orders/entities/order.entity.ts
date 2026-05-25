import {
  BeforeInsert,
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { v7 as uuidv7 } from 'uuid';
import { OrderStatus } from '../enums/order-status.enum';
import { Driver } from '../../drivers/entities/driver.entity';
import { User } from '../../users/entities/user.entity';
import { OrderStatusHistory } from './order-status-history.entity';
import { OrderType } from '../enums/order-type.enum';
import { VehincleType } from '../../drivers/enums/vehincle-type.enum';

@Entity('orders')
@Index('idx_orders_customer_id', ['customerId'])
@Index('idx_orders_assigned_driver_id', ['assignedDriverId'])
@Index('idx_orders_status', ['orderStatus'])
@Index('idx_orders_created_at', ['createdAt'])
export class Order {
  @PrimaryColumn('uuid')
  id!: string;

  @BeforeInsert()
  private beforeInsert(): void {
    if (!this.id) this.id = uuidv7();
  }

  @ManyToOne(() => User, { eager: false })
  @JoinColumn({ name: 'customer_id' })
  customer!: User;

  @Column({ name: 'customer_id', type: 'uuid' })
  customerId!: string;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @Column({
    name: 'order_type',
    type: 'enum',
    enum: OrderType,
  })
  orderType!: OrderType;

  @Column({
    name: 'vehincle_type',
    type: 'enum',
    enum: VehincleType,
  })
  vehincleType!: VehincleType;

  @Column({ name: 'pickup_address', type: 'text' })
  pickupAddress!: string;

  @Column({ name: 'delivery_address', type: 'text' })
  deliveryAddress!: string;

  @Column({ name: 'pickup_latitude', type: 'decimal', precision: 10, scale: 7 })
  pickupLatitude!: number;

  @Column({
    name: 'pickup_longitude',
    type: 'decimal',
    precision: 10,
    scale: 7,
  })
  pickupLongitude!: number;

  @Column({
    name: 'delivery_latitude',
    type: 'decimal',
    precision: 10,
    scale: 7,
  })
  deliveryLatitude!: number;

  @Column({
    name: 'delivery_longitude',
    type: 'decimal',
    precision: 10,
    scale: 7,
  })
  deliveryLongitude!: number;

  @Column({
    name: 'order_status',
    type: 'enum',
    enum: OrderStatus,
    default: OrderStatus.PENDING,
  })
  orderStatus!: OrderStatus;

  @ManyToOne(() => Driver, { eager: false, nullable: true })
  @JoinColumn({ name: 'assigned_driver_id' })
  assignedDriver?: Driver;

  @Column({ name: 'assigned_driver_id', nullable: true })
  assignedDriverId?: string;

  @Column({
    name: 'estimated_price',
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
  })
  estimatedPrice?: number;

  @Column({ name: 'dispatch_attempts', default: 0 })
  dispatchAttempts!: number;

  @Column({
    name: 'attempted_driver_ids',
    type: 'simple-array',
    default: '',
  })
  attemptedDriverIds!: string[];

  @Column({ default: 1 })
  version!: number;

  @OneToMany(() => OrderStatusHistory, (history) => history.order, {
    eager: false,
    cascade: ['insert'],
  })
  statusHistory!: OrderStatusHistory[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @DeleteDateColumn({ name: 'deleted_at', nullable: true })
  deletedAt?: Date;
}
