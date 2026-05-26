import {
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { CreateOrderDto } from './dto/create-order.dto';
import { Order } from './entities/order.entity';
import { DataSource, Repository } from 'typeorm';
import { OrderResponse } from './interfaces/order-response.interface';
import { ORDER_VEHINCLE_MAP } from './constants/order-vehincle-map.contanst';
import { calculateDistance } from 'src/common/utils/distance.util';
import { PRICING } from './constants/pricing.constant';
import { OrderStatusHistory } from './entities/order-status-history.entity';
import { toOrderResponse } from './mappers/order.mapper';
import { OrderStatus } from './enums/order-status.enum';
import { InjectRepository } from '@nestjs/typeorm';
import { TrackingService } from 'src/tracking/tracking.service';
import { JwtUser } from 'src/auth/strategy/jwt.strategy';
import { UserRole } from 'src/users/enums/user-role.enum';
import { ORDER_TRANSITIONS } from './constants/order-transitions.contant';
import { OutboxEvent } from 'src/outbox/entities/outbox-event.entity';
import { OutboxStatus } from 'src/outbox/enums/outbox-status.enum';
import { RedisService } from 'src/redis/redis.service';
import {
  IDEMPOTENCY_KEY_TTL_SECONDS,
  IDEMPOTENCY_REDIS_PREFIX,
} from './constants/order.constants';

@Injectable()
export class OrdersService {
  private static readonly MAX_LIMIT = 100;
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(Order) private readonly orderRepo: Repository<Order>,
    private readonly trackingService: TrackingService,
    private readonly redisService: RedisService,
  ) {}

  async createOrder(
    dto: CreateOrderDto,
    customerId: string,
    idempotencyKey?: string,
  ): Promise<OrderResponse> {
    // Idempotency: if client provides an idempotency key, sanitize and check Redis first
    let sanitizedKey: string | undefined;
    if (idempotencyKey) {
      sanitizedKey = idempotencyKey.trim();
      if (sanitizedKey.length === 0 || sanitizedKey.length > 255) {
        throw new UnprocessableEntityException('Invalid idempotency key');
      }

      const cached = await this.redisService.get(
        IDEMPOTENCY_REDIS_PREFIX(sanitizedKey),
      );
      if (cached) {
        // Return the original response payload as a structured 409 Conflict
        const deserialized = JSON.parse(cached) as OrderResponse;
        throw new ConflictException({
          statusCode: 409,
          message: 'Duplicate request — original order returned',
          data: deserialized,
        });
      }
    }
    const allowedVehincles = ORDER_VEHINCLE_MAP[dto.orderType];

    if (!allowedVehincles.includes(dto.vehincleType)) {
      throw new UnprocessableEntityException(
        `Vehincle type ${dto.vehincleType} is not suitable for order type ${dto.orderType}`,
      );
    }

    const distanceKm = calculateDistance(
      dto.pickupLatitude,
      dto.pickupLongitude,
      dto.deliveryLatitude,
      dto.deliveryLongitude,
    );

    const { baseFare, perKm } = PRICING[dto.vehincleType];
    const estimatedPrice = baseFare + perKm * distanceKm;

    const order = await this.dataSource.transaction<Order>(
      async (manager): Promise<Order> => {
        const newOrder = manager.create(Order, {
          customerId,
          orderType: dto.orderType,
          vehincleType: dto.vehincleType,
          pickupAddress: dto.pickupAddress,
          pickupLatitude: dto.pickupLatitude,
          pickupLongitude: dto.pickupLongitude,
          deliveryAddress: dto.deliveryAddress,
          deliveryLatitude: dto.deliveryLatitude,
          deliveryLongitude: dto.deliveryLongitude,
          notes: dto.notes,
          estimatedPrice,
          orderStatus: OrderStatus.PENDING,
          dispatchAttempts: 0,
          attemptedDriverIds: [],
        });

        const savedOrder = await manager.save(Order, newOrder);

        const history = manager.create(OrderStatusHistory, {
          orderId: savedOrder.id,
          previousStatus: null,
          newStatus: OrderStatus.PENDING,
          actorId: customerId,
        });

        await manager.save(OrderStatusHistory, history);

        const outbox = manager.create(OutboxEvent, {
          eventType: 'dispatch.trigger',
          payload: { orderId: savedOrder.id },
          status: OutboxStatus.PENDING,
          attempts: 0,
        });

        await manager.save(OutboxEvent, outbox);

        return savedOrder;
      },
    );

    const response = toOrderResponse(order);

    if (sanitizedKey) {
      await this.redisService.setWithExpiry(
        IDEMPOTENCY_REDIS_PREFIX(sanitizedKey),
        JSON.stringify(response),
        IDEMPOTENCY_KEY_TTL_SECONDS,
      );
    }

    return response;
  }

  async findById(orderId: string, user: JwtUser): Promise<OrderResponse> {
    const order = await this.orderRepo.findOneBy({ id: orderId });

    if (!order) throw new NotFoundException('Order not found');

    if (user.role === UserRole.CUSTOMER && order.customerId !== user.userId) {
      throw new ForbiddenException('You do not have access to this order');
    }

    return toOrderResponse(order);
  }

  async findAll(
    user: JwtUser,
    limit: number = 20,
    cursor?: string,
    status?: OrderStatus,
  ): Promise<{
    data: OrderResponse[];
    nextCursor: string | null;
    hasNextPage: boolean;
  }> {
    const safeLimit = Math.min(Math.max(limit, 1), OrdersService.MAX_LIMIT);

    const query = this.orderRepo
      .createQueryBuilder('order')
      .orderBy('order.createdAt', 'DESC')
      .addOrderBy('order.id', 'DESC')
      .take(safeLimit + 1);

    if (user.role === UserRole.CUSTOMER) {
      query.where('order.customerId = :customerId', {
        customerId: user.userId,
      });
    }

    if (status) {
      query.andWhere('order.orderStatus = :status', { status });
    }

    if (cursor) {
      const decoded = this.decodeCursor(cursor);
      query.andWhere('(order.createdAt, order.id) < (:createdAt, :id)', {
        createdAt: decoded.createdAt,
        id: decoded.id,
      });
    }

    const orders = await query.getMany();

    const hasNextPage = orders.length > safeLimit;

    if (hasNextPage) orders.pop();

    const nextCursor = hasNextPage
      ? this.encodeCursor(orders[orders.length - 1])
      : null;

    return {
      data: orders.map(toOrderResponse),
      nextCursor,
      hasNextPage,
    };
  }

  async updateStatus(
    orderId: string,
    newStatus: OrderStatus,
    user: JwtUser,
  ): Promise<OrderResponse> {
    const order = await this.orderRepo.findOneBy({ id: orderId });
    if (!order) throw new NotFoundException('Order not found');

    this.validateActor(order, newStatus, user);
    this.validateTransition(order.orderStatus, newStatus);

    const updatedOrder = await this.dataSource.transaction<Order>(
      async (manager): Promise<Order> => {
        const result = await manager
          .createQueryBuilder()
          .update(Order)
          .set({
            orderStatus: newStatus,
            version: order.version + 1,
          })
          .where('id = :orderId AND version = :version', {
            orderId,
            version: order.version,
          })
          .execute();

        if (result.affected === 0) {
          throw new ConflictException(
            'Order was modified by another request, please retry',
          );
        }

        const history = manager.create(OrderStatusHistory, {
          orderId,
          previousStatus: order.orderStatus,
          newStatus,
          actorId: user.userId,
        });

        await manager.save(OrderStatusHistory, history);

        const updated = await manager.findOneBy(Order, { id: orderId });
        if (!updated) throw new NotFoundException('Order not found');

        return updated;
      },
    );

    const terminalStatuses = new Set<OrderStatus>([
      OrderStatus.DELIVERED,
      OrderStatus.CANCELLED,
      OrderStatus.FAILED,
      OrderStatus.EXPIRED,
    ]);

    if (terminalStatuses.has(newStatus)) {
      try {
        await this.trackingService.cancelEtaJob(orderId);
      } catch (err) {
        this.logger.warn(
          `Failed to cancel ETA job for order ${orderId}`,
          err instanceof Error ? err.stack : undefined,
        );
      }
    }

    return toOrderResponse(updatedOrder);
  }

  async cancelOrder(orderId: string, user: JwtUser): Promise<OrderResponse> {
    return this.updateStatus(orderId, OrderStatus.CANCELLED, user);
  }

  async softDelete(orderId: string): Promise<{ message: string }> {
    const order = await this.orderRepo.findOneBy({ id: orderId });

    if (!order) throw new NotFoundException('Order not found');

    const activeStatuses = [
      OrderStatus.DRIVER_ASSIGNED,
      OrderStatus.DRIVER_ARRIVING,
      OrderStatus.PICKED_UP,
      OrderStatus.IN_TRANSIT,
    ];

    if (activeStatuses.includes(order.orderStatus)) {
      throw new UnprocessableEntityException(
        `Cannot delete an order that is currently ${order.orderStatus}`,
      );
    }

    await this.orderRepo.softDelete(orderId);

    return { message: 'Order deleted successfully' };
  }

  private validateActor(
    order: Order,
    newStatus: OrderStatus,
    user: JwtUser,
  ): void {
    const { role, userId, driverProfileId } = user;

    const systemOnlyStatuses = [
      OrderStatus.DRIVER_ASSIGNED,
      OrderStatus.EXPIRED,
    ];

    if (systemOnlyStatuses.includes(newStatus)) {
      throw new ForbiddenException(
        `${newStatus} is managed by the system only`,
      );
    }

    const terminalStatuses = [
      OrderStatus.DELIVERED,
      OrderStatus.CANCELLED,
      OrderStatus.FAILED,
      OrderStatus.EXPIRED,
    ];

    if (terminalStatuses.includes(order.orderStatus)) {
      throw new ForbiddenException(
        `Order is already ${order.orderStatus} and cannot be updated`,
      );
    }

    if (role === UserRole.ADMIN) {
      if (newStatus === OrderStatus.CANCELLED) return;
      if (
        newStatus === OrderStatus.FAILED &&
        order.orderStatus === OrderStatus.IN_TRANSIT
      )
        return;
      throw new ForbiddenException(
        `Admins can only cancel orders or mark IN_TRANSIT orders as failed`,
      );
    }

    if (role === UserRole.CUSTOMER) {
      if (order.customerId !== userId) {
        throw new ForbiddenException('You do not have access to this order');
      }

      if (newStatus !== OrderStatus.CANCELLED) {
        throw new ForbiddenException('Customers can only cancel orders');
      }

      const cancellableStatuses = [
        OrderStatus.PENDING,
        OrderStatus.DRIVER_ASSIGNED,
      ];
      if (!cancellableStatuses.includes(order.orderStatus)) {
        throw new ForbiddenException(
          `You can no longer cancel this order — driver is already ${order.orderStatus}`,
        );
      }

      return;
    }

    if (role === UserRole.DRIVER) {
      if (!driverProfileId) {
        throw new ForbiddenException('Driver profile missing from token');
      }

      if (!order.assignedDriverId) {
        throw new ForbiddenException('This order has no assigned driver yet');
      }

      if (order.assignedDriverId !== driverProfileId) {
        throw new ForbiddenException('You are not assigned to this order');
      }

      const driverAllowedTransitions: Partial<
        Record<OrderStatus, OrderStatus[]>
      > = {
        [OrderStatus.DRIVER_ASSIGNED]: [OrderStatus.DRIVER_ARRIVING],
        [OrderStatus.DRIVER_ARRIVING]: [OrderStatus.PICKED_UP],
        [OrderStatus.PICKED_UP]: [OrderStatus.IN_TRANSIT],
        [OrderStatus.IN_TRANSIT]: [OrderStatus.DELIVERED, OrderStatus.FAILED],
      };

      const allowedForDriver =
        driverAllowedTransitions[order.orderStatus] ?? [];
      if (!allowedForDriver.includes(newStatus)) {
        throw new ForbiddenException(
          `Drivers cannot transition an order from ${order.orderStatus} to ${newStatus}`,
        );
      }

      return;
    }

    throw new ForbiddenException(
      'You are not authorized to update order status',
    );
  }

  private validateTransition(
    currentStatus: OrderStatus,
    newStatus: OrderStatus,
  ): void {
    const allowedTransitions = ORDER_TRANSITIONS[currentStatus] ?? [];
    if (!allowedTransitions.includes(newStatus)) {
      throw new UnprocessableEntityException(
        `Invalid order status transition from ${currentStatus} to ${newStatus}`,
      );
    }
  }

  private encodeCursor(order: Order): string {
    const payload = JSON.stringify({
      createdAt: order.createdAt,
      id: order.id,
    });

    return Buffer.from(payload).toString('base64');
  }

  private decodeCursor(cursor: string): { createdAt: Date; id: string } {
    try {
      const payload = Buffer.from(cursor, 'base64').toString('utf8');
      const decoded = JSON.parse(payload) as { createdAt: string; id: string };
      if (!decoded?.createdAt || !decoded?.id) {
        throw new UnprocessableEntityException('Invalid pagination cursor');
      }

      const createdAt = new Date(decoded.createdAt);
      if (Number.isNaN(createdAt.getTime())) {
        throw new UnprocessableEntityException('Invalid pagination cursor');
      }

      return { createdAt, id: decoded.id };
    } catch {
      throw new UnprocessableEntityException('Invalid pagination cursor');
    }
  }
}
