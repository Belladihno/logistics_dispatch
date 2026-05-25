import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { DISPATCH_QUEUE_CONFIG } from './constants/dispatch.constants';
import { RedisInfrastructureModule } from 'src/redis/redis.module';
import { EventsModule } from 'src/events/events.module';
import { DispatchService } from './dispatch.service';
import { DispatchProcessor } from './dispatch.processor';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Order } from 'src/orders/entities/order.entity';
import { Driver } from 'src/drivers/entities/driver.entity';
import { OrderStatusHistory } from 'src/orders/entities/order-status-history.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Order, Driver, OrderStatusHistory]),
    RedisInfrastructureModule,
    EventsModule,
    BullModule.registerQueue({
      ...DISPATCH_QUEUE_CONFIG,
      defaultJobOptions: {
        attempts: 1, // no BullMQ auto-retry; dispatch logic handles retries manually
        removeOnComplete: { count: 100 },
        removeOnFail: { count: 1000 },
      },
    }),
  ],
  providers: [DispatchService, DispatchProcessor],
  exports: [DispatchService],
})
export class DispatchModule {}
