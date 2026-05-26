import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { OutboxEvent } from './entities/outbox-event.entity';
import { OutboxStatus } from './enums/outbox-status.enum';
import { DispatchService } from 'src/dispatch/dispatch.service';

type DispatchTriggerPayload = { orderId: string };

function isDispatchTriggerPayload(v: unknown): v is DispatchTriggerPayload {
  return (
    typeof v === 'object' &&
    v !== null &&
    'orderId' in v &&
    typeof (v as Record<string, unknown>).orderId === 'string'
  );
}

@Injectable()
export class OutboxWorkerService {
  private readonly logger = new Logger(OutboxWorkerService.name);
  private readonly BATCH_SIZE = 10;
  private readonly MAX_ATTEMPTS = 5;

  constructor(
    @InjectRepository(OutboxEvent)
    private readonly outboxRepo: Repository<OutboxEvent>,
    private readonly dispatchService: DispatchService,
    private readonly dataSource: DataSource,
  ) {}

  @Cron(CronExpression.EVERY_5_SECONDS)
  async processOutbox(): Promise<void> {
    const rows = await this.dataSource.transaction(async (manager) => {
      return manager
        .createQueryBuilder(OutboxEvent, 'outbox')
        .where('outbox.status = :status', { status: OutboxStatus.PENDING })
        .orderBy('outbox.createdAt', 'ASC')
        .take(this.BATCH_SIZE)
        .setLock('pessimistic_write')
        .setOnLocked('skip_locked')
        .getMany();
    });

    if (rows.length === 0) return;

    for (const row of rows) {
      try {
        await this.handleRow(row);
      } catch (err) {
        const trace = err instanceof Error ? err.stack : String(err);
        this.logger.error(`Outbox processing error for ${row.id}`, trace);
      }
    }
  }

  private async handleRow(row: OutboxEvent): Promise<void> {
    try {
      if (row.eventType === 'dispatch.trigger') {
        if (!isDispatchTriggerPayload(row.payload)) {
          throw new Error(
            `Invalid dispatch.trigger payload: ${JSON.stringify(row.payload)}`,
          );
        }
        await this.dispatchService.triggerDispatch(row.payload.orderId);
      } else {
        this.logger.warn(`Unknown outbox event type: ${row.eventType}`);
      }

      row.status = OutboxStatus.PROCESSED;
      row.processedAt = new Date();
      await this.outboxRepo.save(row);
    } catch (err) {
      row.attempts = (row.attempts ?? 0) + 1;
      row.lastError = err instanceof Error ? err.message : String(err);
      if (row.attempts >= this.MAX_ATTEMPTS) {
        row.status = OutboxStatus.FAILED;
      }
      await this.outboxRepo.save(row);
      if (row.status === OutboxStatus.FAILED) {
        this.logger.error(
          `Outbox row ${row.id} permanently failed after ${row.attempts} attempts. Last error: ${row.lastError}`,
        );
      } else {
        this.logger.warn(`Outbox row ${row.id} failed attempt ${row.attempts}`);
      }
    }
  }
}
