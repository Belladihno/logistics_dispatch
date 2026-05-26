import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { getQueueToken } from '@nestjs/bullmq';
import type { Queue } from 'bullmq';
import { InjectRepository } from '@nestjs/typeorm';
import {
  DispatchJobName,
  DISPATCH_DEFAULTS,
  DISPATCH_QUEUE,
  DISPATCH_TIMEOUT_KEY,
} from './constants/dispatch.constants';
import {
  AssignDriverJobDto,
  DispatchTimeoutJobDto,
} from './dto/dispatch-job.dto';
import { DataSource, In, IsNull, Not, Repository } from 'typeorm';
import { Order } from 'src/orders/entities/order.entity';
import { Driver } from 'src/drivers/entities/driver.entity';
import { OrderStatus } from 'src/orders/enums/order-status.enum';
import { calculateDistance } from 'src/common/utils/distance.util';
import { OrderStatusHistory } from 'src/orders/entities/order-status-history.entity';
import { RedisService } from 'src/redis/redis.service';
import { ConfigService } from '@nestjs/config';
import { EventPublisherService } from 'src/events/event-publisher.service';
import { TrackingService } from 'src/tracking/tracking.service';

type DispatchJobPayload = AssignDriverJobDto | DispatchTimeoutJobDto;

@Injectable()
export class DispatchService {
  private readonly logger = new Logger(DispatchService.name);
  private readonly terminalStatuses = new Set<OrderStatus>([
    OrderStatus.DELIVERED,
    OrderStatus.CANCELLED,
    OrderStatus.FAILED,
    OrderStatus.EXPIRED,
  ]);
  private readonly maxDispatchAttempts: number;
  private readonly dispatchTimeoutSeconds: number;

  constructor(
    @Inject(getQueueToken(DISPATCH_QUEUE))
    private readonly dispatchQueue: Queue<DispatchJobPayload>,
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
    @InjectRepository(Driver)
    private readonly driverRepo: Repository<Driver>,
    private readonly dataSource: DataSource,
    private readonly redisService: RedisService,
    private readonly configService: ConfigService,
    private readonly eventPublisher: EventPublisherService,
    private readonly trackingService: TrackingService,
  ) {
    this.maxDispatchAttempts = this.getPositiveIntFromEnv(
      'MAX_DISPATCH_ATTEMPTS',
      DISPATCH_DEFAULTS.MAX_ATTEMPTS,
    );
    this.dispatchTimeoutSeconds = this.getPositiveIntFromEnv(
      'DISPATCH_TIMEOUT_SECONDS',
      DISPATCH_DEFAULTS.TIMEOUT_SECONDS,
    );
  }

  async triggerDispatch(orderId: string): Promise<void> {
    await this.dispatchQueue.add(
      DispatchJobName.ASSIGN_DRIVER,
      { orderId },
      {
        jobId: `assign-driver:${orderId}`,
      },
    );
  }

  async handleAssignDriver(data: AssignDriverJobDto): Promise<void> {
    const order = await this.orderRepo.findOneBy({ id: data.orderId });

    if (!order) return;
    if (this.shouldSkipAssignment(order)) return;
    if (order.dispatchAttempts >= this.maxDispatchAttempts) {
      await this.expireOrder(order.id);
      // Intentional fire-and-forget for notification side-effect.
      this.eventPublisher.notifyCustomerStatusChanged(
        order.id,
        OrderStatus.EXPIRED,
      );
      return;
    }

    const candidateDrivers = await this.findNearestEligibleDrivers(order);

    if (candidateDrivers.length === 0) {
      await this.expireOrder(order.id);
      // Intentional fire-and-forget for notification side-effect.
      this.eventPublisher.notifyCustomerStatusChanged(
        order.id,
        OrderStatus.EXPIRED,
      );
      return;
    }

    const assignment = await this.assignDriverWithLock(
      order.id,
      candidateDrivers,
    );
    if (!assignment) {
      await this.expireOrder(order.id);
      // Intentional fire-and-forget for notification side-effect.
      this.eventPublisher.notifyCustomerStatusChanged(
        order.id,
        OrderStatus.EXPIRED,
      );
      return;
    }

    const timeoutJob = await this.dispatchQueue.add(
      DispatchJobName.DISPATCH_TIMEOUT,
      {
        orderId: order.id,
        driverId: assignment.driverId,
      },
      {
        delay: this.dispatchTimeoutSeconds * 1000,
        jobId: `dispatch-timeout:${order.id}:${assignment.driverId}`,
      },
    );

    const timeoutKey = DISPATCH_TIMEOUT_KEY(order.id);
    await this.redisService.setWithExpiry(
      timeoutKey,
      String(timeoutJob.id),
      this.dispatchTimeoutSeconds * 2,
    );

    // Intentional fire-and-forget for notification side-effect.
    this.eventPublisher.notifyDriverAssigned(order.id, assignment.driverId);
  }

  async handleDispatchTimeout(data: DispatchTimeoutJobDto): Promise<void> {
    type TimeoutResult =
      | { action: 'skip' }
      | { action: 'expired'; orderId: string }
      | { action: 'redispatch'; orderId: string };

    const timeoutResult = await this.dataSource.transaction<TimeoutResult>(
      async (manager) => {
        const lockedOrder = await manager
          .getRepository(Order)
          .createQueryBuilder('order')
          .setLock('pessimistic_write')
          .where('order.id = :orderId', { orderId: data.orderId })
          .getOne();

        if (!lockedOrder) return { action: 'skip' };
        if (this.terminalStatuses.has(lockedOrder.orderStatus)) {
          return { action: 'skip' };
        }

        // Idempotency guard: stale timeout after accept/status advance.
        if (lockedOrder.orderStatus !== OrderStatus.DRIVER_ASSIGNED) {
          return { action: 'skip' };
        }

        // Stale timeout for a previous assignment.
        if (lockedOrder.assignedDriverId !== data.driverId) {
          return { action: 'skip' };
        }

        const previousStatus = lockedOrder.orderStatus;
        lockedOrder.assignedDriverId = null;
        lockedOrder.dispatchAttempts += 1;
        lockedOrder.version += 1;

        if (lockedOrder.dispatchAttempts >= this.maxDispatchAttempts) {
          lockedOrder.orderStatus = OrderStatus.EXPIRED;
          await manager.save(Order, lockedOrder);

          const expireHistory = manager.create(OrderStatusHistory, {
            orderId: lockedOrder.id,
            previousStatus,
            newStatus: OrderStatus.EXPIRED,
            actorId: 'system',
          });
          await manager.save(OrderStatusHistory, expireHistory);

          return { action: 'expired', orderId: lockedOrder.id };
        }

        lockedOrder.orderStatus = OrderStatus.PENDING;
        await manager.save(Order, lockedOrder);

        const pendingHistory = manager.create(OrderStatusHistory, {
          orderId: lockedOrder.id,
          previousStatus,
          newStatus: OrderStatus.PENDING,
          actorId: 'system',
        });
        await manager.save(OrderStatusHistory, pendingHistory);

        return { action: 'redispatch', orderId: lockedOrder.id };
      },
    );

    if (timeoutResult.action !== 'skip') {
      await this.redisService.del(DISPATCH_TIMEOUT_KEY(data.orderId));
    }

    if (timeoutResult.action === 'expired') {
      // Cancel any ETA recalculation jobs for this order
      try {
        await this.trackingService.cancelEtaJob(timeoutResult.orderId);
      } catch (err) {
        this.logger.warn(
          `Failed to cancel ETA job for order ${timeoutResult.orderId}`,
          err instanceof Error ? err.stack : undefined,
        );
      }

      // Intentional fire-and-forget for notification side-effect.
      this.eventPublisher.notifyCustomerStatusChanged(
        timeoutResult.orderId,
        OrderStatus.EXPIRED,
      );
      // Notify the driver whose window expired so client can dismiss UI
      this.eventPublisher.notifyDriverTimeout(data.orderId, data.driverId);
      return;
    }

    if (timeoutResult.action === 'redispatch') {
      // Notify the driver whose accept window expired
      this.eventPublisher.notifyDriverTimeout(data.orderId, data.driverId);
      await this.triggerDispatch(timeoutResult.orderId);
    }
  }

  async acceptDispatch(
    orderId: string,
    driverId: string,
  ): Promise<{ message: string }> {
    type AcceptResult =
      | { action: 'already-accepted' }
      | { action: 'accepted'; orderId: string };

    const result = await this.dataSource.transaction<AcceptResult>(
      async (manager) => {
        const lockedOrder = await manager
          .getRepository(Order)
          .createQueryBuilder('order')
          .setLock('pessimistic_write')
          .where('order.id = :orderId', { orderId })
          .getOne();

        if (!lockedOrder) {
          throw new NotFoundException('Order not found');
        }

        if (lockedOrder.orderStatus === OrderStatus.DRIVER_ARRIVING) {
          if (lockedOrder.assignedDriverId === driverId) {
            return { action: 'already-accepted' };
          }
        }

        if (lockedOrder.orderStatus !== OrderStatus.DRIVER_ASSIGNED) {
          throw new ConflictException(
            'Order is no longer awaiting driver response',
          );
        }

        if (lockedOrder.assignedDriverId !== driverId) {
          throw new ForbiddenException('You are not assigned to this order');
        }

        const previousStatus = lockedOrder.orderStatus;
        lockedOrder.orderStatus = OrderStatus.DRIVER_ARRIVING;
        lockedOrder.version += 1;

        await manager.save(Order, lockedOrder);

        const history = manager.create(OrderStatusHistory, {
          orderId: lockedOrder.id,
          previousStatus,
          newStatus: OrderStatus.DRIVER_ARRIVING,
          actorId: driverId,
        });
        await manager.save(OrderStatusHistory, history);

        return { action: 'accepted', orderId: lockedOrder.id };
      },
    );

    if (result.action === 'accepted') {
      await this.cancelDispatchTimeout(orderId);
      // Intentional fire-and-forget for notification side-effect.
      this.eventPublisher.notifyCustomerStatusChanged(
        result.orderId,
        OrderStatus.DRIVER_ARRIVING,
      );
      // Schedule ETA recalculation for this order
      await this.trackingService.ensureEtaJobScheduled(
        result.orderId,
        driverId,
      );
      return { message: 'Dispatch accepted successfully' };
    }

    return { message: 'Dispatch already accepted' };
  }

  async rejectDispatch(
    orderId: string,
    driverId: string,
  ): Promise<{ message: string }> {
    type RejectResult =
      | { action: 'already-handled' }
      | { action: 'expired'; orderId: string }
      | { action: 'redispatch'; orderId: string };

    const result = await this.dataSource.transaction<RejectResult>(
      async (manager) => {
        const lockedOrder = await manager
          .getRepository(Order)
          .createQueryBuilder('order')
          .setLock('pessimistic_write')
          .where('order.id = :orderId', { orderId })
          .getOne();

        if (!lockedOrder) {
          throw new NotFoundException('Order not found');
        }

        if (
          lockedOrder.orderStatus === OrderStatus.PENDING ||
          lockedOrder.orderStatus === OrderStatus.EXPIRED
        ) {
          return { action: 'already-handled' };
        }

        if (lockedOrder.orderStatus !== OrderStatus.DRIVER_ASSIGNED) {
          throw new ConflictException(
            'Order is no longer awaiting driver response',
          );
        }

        if (lockedOrder.assignedDriverId !== driverId) {
          throw new ForbiddenException('You are not assigned to this order');
        }

        const previousStatus = lockedOrder.orderStatus;
        lockedOrder.assignedDriverId = null;
        lockedOrder.dispatchAttempts += 1;
        lockedOrder.version += 1;
        lockedOrder.attemptedDriverIds = [
          ...(lockedOrder.attemptedDriverIds ?? []),
          driverId,
        ];

        if (lockedOrder.dispatchAttempts >= this.maxDispatchAttempts) {
          lockedOrder.orderStatus = OrderStatus.EXPIRED;
          await manager.save(Order, lockedOrder);

          const expireHistory = manager.create(OrderStatusHistory, {
            orderId: lockedOrder.id,
            previousStatus,
            newStatus: OrderStatus.EXPIRED,
            actorId: driverId,
          });
          await manager.save(OrderStatusHistory, expireHistory);

          return { action: 'expired', orderId: lockedOrder.id };
        }

        lockedOrder.orderStatus = OrderStatus.PENDING;
        await manager.save(Order, lockedOrder);

        const pendingHistory = manager.create(OrderStatusHistory, {
          orderId: lockedOrder.id,
          previousStatus,
          newStatus: OrderStatus.PENDING,
          actorId: driverId,
        });
        await manager.save(OrderStatusHistory, pendingHistory);

        return { action: 'redispatch', orderId: lockedOrder.id };
      },
    );

    if (result.action === 'expired') {
      await this.cancelDispatchTimeout(orderId);
      try {
        await this.trackingService.cancelEtaJob(result.orderId);
      } catch (err) {
        this.logger.warn(
          `Failed to cancel ETA job for order ${result.orderId}`,
          err instanceof Error ? err.stack : undefined,
        );
      }
      // Intentional fire-and-forget for notification side-effect.
      this.eventPublisher.notifyCustomerStatusChanged(
        result.orderId,
        OrderStatus.EXPIRED,
      );
      return { message: 'Dispatch rejected. Order expired.' };
    }

    if (result.action === 'redispatch') {
      await this.cancelDispatchTimeout(orderId);
      await this.triggerDispatch(result.orderId);
      return { message: 'Dispatch rejected. Reassigning another driver.' };
    }

    return { message: 'Dispatch already handled' };
  }

  private shouldSkipAssignment(order: Order): boolean {
    if (this.terminalStatuses.has(order.orderStatus)) {
      return true;
    }

    if (order.orderStatus !== OrderStatus.PENDING) {
      return true;
    }

    return false;
  }

  private async findNearestEligibleDrivers(order: Order): Promise<Driver[]> {
    const attemptedDriverIds = (order.attemptedDriverIds ?? []).filter(
      (driverId) => driverId.length > 0,
    );

    const candidates = await this.driverRepo.find({
      where: {
        onlineStatus: true,
        isSuspended: false,
        vehincleType: order.vehincleType,
        currentLatitude: Not(IsNull()),
        currentLongitude: Not(IsNull()),
        ...(attemptedDriverIds.length > 0
          ? { id: Not(In(attemptedDriverIds)) }
          : {}),
      },
    });

    // NOTE: This in-memory sort is acceptable for early stage volume.
    // At scale, replace with geospatial query/index (e.g. PostGIS).
    return candidates
      .filter(
        (driver) =>
          driver.currentLatitude !== undefined &&
          driver.currentLongitude !== undefined &&
          driver.currentLatitude !== null &&
          driver.currentLongitude !== null,
      )
      .sort((driverA, driverB) => {
        const distanceA = calculateDistance(
          Number(order.pickupLatitude),
          Number(order.pickupLongitude),
          Number(driverA.currentLatitude),
          Number(driverA.currentLongitude),
        );
        const distanceB = calculateDistance(
          Number(order.pickupLatitude),
          Number(order.pickupLongitude),
          Number(driverB.currentLatitude),
          Number(driverB.currentLongitude),
        );
        return distanceA - distanceB;
      });
  }

  private async assignDriverWithLock(
    orderId: string,
    candidateDrivers: Driver[],
  ): Promise<{ driverId: string } | null> {
    return this.dataSource.transaction(async (manager) => {
      const lockedOrder = await manager
        .getRepository(Order)
        .createQueryBuilder('order')
        .setLock('pessimistic_write')
        .where('order.id = :orderId', { orderId })
        .getOne();

      if (!lockedOrder) return null;
      if (this.shouldSkipAssignment(lockedOrder)) return null;

      const attemptedDriverIds = new Set(
        (lockedOrder.attemptedDriverIds ?? []).filter(
          (driverId) => driverId.length > 0,
        ),
      );

      for (const candidate of candidateDrivers) {
        if (attemptedDriverIds.has(candidate.id)) continue;

        const lockedDriver = await manager
          .getRepository(Driver)
          .createQueryBuilder('driver')
          .setLock('pessimistic_write')
          .setOnLocked('skip_locked')
          .where('driver.id = :driverId', { driverId: candidate.id })
          .andWhere('driver.onlineStatus = :onlineStatus', {
            onlineStatus: true,
          })
          .andWhere('driver.isSuspended = :isSuspended', {
            isSuspended: false,
          })
          .andWhere('driver.vehincleType = :vehincleType', {
            vehincleType: lockedOrder.vehincleType,
          })
          .getOne();

        if (!lockedDriver) continue;

        const previousStatus = lockedOrder.orderStatus;
        lockedOrder.assignedDriverId = lockedDriver.id;
        lockedOrder.orderStatus = OrderStatus.DRIVER_ASSIGNED;
        lockedOrder.dispatchAttempts += 1;
        lockedOrder.version += 1;
        lockedOrder.attemptedDriverIds = [
          ...attemptedDriverIds,
          lockedDriver.id,
        ];

        await manager.save(Order, lockedOrder);

        const history = manager.create(OrderStatusHistory, {
          orderId: lockedOrder.id,
          previousStatus,
          newStatus: OrderStatus.DRIVER_ASSIGNED,
          actorId: 'system',
        });
        await manager.save(OrderStatusHistory, history);

        return { driverId: lockedDriver.id };
      }

      // Returns null when all candidates are currently locked by concurrent
      // transactions (`skip_locked`), which can lead to early expiry in the
      // caller. Accepted tradeoff for now to avoid blocking/deadlock risk.
      return null;
    });
  }

  private async expireOrder(orderId: string): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      const lockedOrder = await manager
        .getRepository(Order)
        .createQueryBuilder('order')
        .setLock('pessimistic_write')
        .where('order.id = :orderId', { orderId })
        .getOne();

      if (!lockedOrder) return;
      if (this.shouldSkipAssignment(lockedOrder)) return;

      const previousStatus = lockedOrder.orderStatus;
      lockedOrder.orderStatus = OrderStatus.EXPIRED;
      lockedOrder.assignedDriverId = null;
      lockedOrder.dispatchAttempts += 1;
      lockedOrder.version += 1;

      await manager.save(Order, lockedOrder);

      const history = manager.create(OrderStatusHistory, {
        orderId: lockedOrder.id,
        previousStatus,
        newStatus: OrderStatus.EXPIRED,
        actorId: 'system',
      });
      await manager.save(OrderStatusHistory, history);
    });
    try {
      await this.trackingService.cancelEtaJob(orderId);
    } catch (err) {
      this.logger.warn(
        `Failed to cancel ETA job for order ${orderId}`,
        err instanceof Error ? err.stack : undefined,
      );
    }
  }

  private getPositiveIntFromEnv(variable: string, fallback: number): number {
    const value = this.configService.get<string>(variable);
    const parsed = Number(value);

    if (Number.isFinite(parsed) && parsed > 0) {
      return Math.floor(parsed);
    }

    return fallback;
  }

  private async cancelDispatchTimeout(orderId: string): Promise<void> {
    const timeoutKey = DISPATCH_TIMEOUT_KEY(orderId);
    const timeoutJobId = await this.redisService.get(timeoutKey);

    if (!timeoutJobId) return;

    const timeoutJob = await this.dispatchQueue.getJob(timeoutJobId);

    if (timeoutJob) {
      try {
        await timeoutJob.remove();
      } catch (error) {
        this.logger.warn(
          `Failed to remove timeout job ${timeoutJobId} for order ${orderId}`,
          error instanceof Error ? error.stack : undefined,
        );
      }
    }

    await this.redisService.del(timeoutKey);
  }
}
