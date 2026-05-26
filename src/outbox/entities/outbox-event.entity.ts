import {
  BeforeInsert,
  Column,
  CreateDateColumn,
  Entity,
  PrimaryColumn,
} from 'typeorm';
import { v7 as uuidv7 } from 'uuid';
import { OutboxStatus } from '../enums/outbox-status.enum';

@Entity('outbox_events')
export class OutboxEvent {
  @PrimaryColumn('uuid')
  id!: string;

  @BeforeInsert()
  private beforeInsert(): void {
    if (!this.id) this.id = uuidv7();
  }

  @Column({ name: 'event_type' })
  eventType!: string;

  @Column({ name: 'payload', type: 'jsonb' })
  payload!: Record<string, unknown>;

  @Column({ name: 'status', type: 'varchar', length: 32 })
  status!: OutboxStatus;

  @Column({ name: 'attempts', type: 'int', default: 0 })
  attempts!: number;

  @Column({ name: 'last_error', type: 'text', nullable: true })
  lastError?: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @Column({ name: 'processed_at', type: 'timestamp', nullable: true })
  processedAt?: Date | null;
}
