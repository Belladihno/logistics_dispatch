import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OutboxEvent } from './entities/outbox-event.entity';
import { OutboxWorkerService } from './outbox-worker.service';
import { DispatchModule } from 'src/dispatch/dispatch.module';

@Module({
  imports: [TypeOrmModule.forFeature([OutboxEvent]), DispatchModule],
  providers: [OutboxWorkerService],
})
export class OutboxModule {}
