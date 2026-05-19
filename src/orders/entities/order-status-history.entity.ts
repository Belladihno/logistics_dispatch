import {
  BeforeInsert,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
} from 'typeorm';
import { v7 as uuidv7 } from 'uuid';
import { Order } from './order.entity';
import { OrderStatus } from '../enums/order-status.enum';

@Entity('order_status_history')
@Index('idx_order_status_history_order_id', ['orderId'])
export class OrderStatusHistory {
  @PrimaryColumn('uuid')
  id!: string;

  @BeforeInsert()
  private beforeInsert(): void {
    if (!this.id) this.id = uuidv7();
  }

  @ManyToOne(() => Order, (order) => order.statusHistory, {
    eager: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'order_id' })
  order!: Order;

  @Column({ name: 'order_id' })
  orderId!: string;

  @Column({
    name: 'previous_status',
    type: 'enum',
    enum: OrderStatus,
    nullable: true,
  })
  previousStatus?: OrderStatus;

  @Column({ name: 'new_status', type: 'enum', enum: OrderStatus })
  newStatus!: OrderStatus;

  @Column({ name: 'actor_id' })
  actorId!: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
