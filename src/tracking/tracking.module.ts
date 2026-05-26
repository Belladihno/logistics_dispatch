import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { Driver } from 'src/drivers/entities/driver.entity';
import { Order } from 'src/orders/entities/order.entity';
import { TrackingService } from './tracking.service';
import { TrackingProcessor } from './tracking.processor';
import { TRACKING_QUEUE_CONFIG } from './constants/tracking.constants';
import { EventsModule } from 'src/events/events.module';
import { RedisInfrastructureModule } from 'src/redis/redis.module';

@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([Driver, Order]),
    RedisInfrastructureModule,
    EventsModule,
    BullModule.registerQueue({
      ...TRACKING_QUEUE_CONFIG,
      defaultJobOptions: {
        removeOnComplete: { count: 100 },
        removeOnFail: { count: 1000 },
      },
    }),
  ],
  providers: [TrackingService, TrackingProcessor],
  exports: [TrackingService],
})
export class TrackingModule {}
