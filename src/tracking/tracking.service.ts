import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Driver } from 'src/drivers/entities/driver.entity';
import { Order } from 'src/orders/entities/order.entity';
import { EventPublisherService } from 'src/events/event-publisher.service';
import { ModuleRef } from '@nestjs/core';
import { RedisService } from 'src/redis/redis.service';
import { Inject } from '@nestjs/common';
import { getQueueToken } from '@nestjs/bullmq';
import type { Queue } from 'bullmq';
import {
  TRACKING_QUEUE,
  ETA_JOB_KEY,
  ETA_RECALCULATE_DELAY_MS,
  ETA_AVERAGE_SPEED_KMH,
  ACTIVE_ORDER_KEY,
} from './constants/tracking.constants';
import { calculateDistance } from 'src/common/utils/distance.util';
import { OrderStatus } from 'src/orders/enums/order-status.enum';

@Injectable()
export class TrackingService {
  private readonly logger = new Logger(TrackingService.name);

  constructor(
    @InjectRepository(Driver)
    private readonly driverRepo: Repository<Driver>,
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
    private readonly moduleRef: ModuleRef,
    private readonly redisService: RedisService,
    @Inject(getQueueToken(TRACKING_QUEUE))
    private readonly trackingQueue: Queue,
  ) {}

  private get eventPublisher(): EventPublisherService {
    return this.moduleRef.get(EventPublisherService, { strict: false });
  }

  async handleLocationUpdate(
    driverProfileId: string,
    lat: number,
    lng: number,
  ): Promise<string | null> {
    await this.driverRepo.update(
      { id: driverProfileId },
      { currentLatitude: lat, currentLongitude: lng },
    );

    let orderId = await this.redisService.get(
      ACTIVE_ORDER_KEY(driverProfileId),
    );
    if (!orderId) {
      const active = await this.orderRepo.findOne({
        where: {
          assignedDriverId: driverProfileId,
          orderStatus: In([
            OrderStatus.DRIVER_ARRIVING,
            OrderStatus.PICKED_UP,
            OrderStatus.IN_TRANSIT,
          ]),
        },
      });
      if (active) {
        orderId = active.id;
        await this.redisService.setWithExpiry(
          ACTIVE_ORDER_KEY(driverProfileId),
          orderId,
          60,
        );
      }
    }

    if (orderId) {
      // fire-and-forget broadcast
      this.eventPublisher.notifyLocationBroadcast(orderId, lat, lng);
      // Ensure ETA job is scheduled for this active order
      await this.ensureEtaJobScheduled(orderId, driverProfileId);
      return orderId;
    }

    return null;
  }

  // Placeholders for ETA job scheduling/cancellation
  async ensureEtaJobScheduled(
    orderId: string,
    driverProfileId: string,
  ): Promise<void> {
    const key = ETA_JOB_KEY(orderId);
    const existing = await this.redisService.get(key);
    if (existing) return;

    const job = await this.trackingQueue.add(
      'recalculate_eta',
      { orderId, driverProfileId },
      { jobId: `recalculate-eta:${orderId}` },
    );
    await this.redisService.setWithExpiry(key, String(job.id), 60 * 60 * 24);
    this.logger.debug(`Scheduled ETA job ${String(job.id)} for ${orderId}`);
  }

  async cancelEtaJob(orderId: string): Promise<void> {
    const key = ETA_JOB_KEY(orderId);
    const jobId = await this.redisService.get(key);
    if (!jobId) return;

    try {
      const job = await this.trackingQueue.getJob(jobId);
      if (job) await job.remove();
    } catch (err) {
      this.logger.warn(
        `Failed to remove ETA job ${jobId} for ${orderId}`,
        err instanceof Error ? err.stack : undefined,
      );
    }

    await this.redisService.del(key);
    this.logger.debug(`Cancelled ETA job for ${orderId}`);
  }

  async handleEtaRecalculation(
    orderId: string,
    driverProfileId: string,
  ): Promise<void> {
    const order = await this.orderRepo.findOne({ where: { id: orderId } });
    if (!order || !order.assignedDriverId) {
      await this.cancelEtaJob(orderId);
      return;
    }
    // Guard: ensure job's driver matches current assignment
    if (order.assignedDriverId !== driverProfileId) {
      await this.cancelEtaJob(orderId);
      return;
    }

    const driver = await this.driverRepo.findOne({
      where: { id: driverProfileId },
    });
    if (
      !driver ||
      driver.currentLatitude == null ||
      driver.currentLongitude == null
    ) {
      // No driver location, cancel job
      await this.cancelEtaJob(orderId);
      return;
    }

    const distanceKm = calculateDistance(
      Number(driver.currentLatitude),
      Number(driver.currentLongitude),
      Number(order.deliveryLatitude),
      Number(order.deliveryLongitude),
    );

    const etaSeconds = Math.round((distanceKm / ETA_AVERAGE_SPEED_KMH) * 3600);

    this.eventPublisher.notifyLocationBroadcast(
      orderId,
      Number(driver.currentLatitude),
      Number(driver.currentLongitude),
      etaSeconds,
    );

    // Re-enqueue next recalculation after delay
    const nextJob = await this.trackingQueue.add(
      'recalculate_eta',
      { orderId, driverProfileId },
      { jobId: `recalculate-eta:${orderId}`, delay: ETA_RECALCULATE_DELAY_MS },
    );
    await this.redisService.setWithExpiry(
      ETA_JOB_KEY(orderId),
      String(nextJob.id),
      60 * 60 * 24,
    );
    this.logger.debug(
      `Re-enqueued ETA job ${String(nextJob.id)} for ${orderId}`,
    );
  }
}
