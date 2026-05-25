import { Injectable, Logger } from '@nestjs/common';
import { EventsGateway } from './events.gateway';
import {
  DispatchAssignedPayload,
  EVENT_DISPATCH_ASSIGNED,
  EVENT_ORDER_STATUS_CHANGED,
  OrderStatusChangedPayload,
  ROOM_DRIVER,
  ROOM_ORDER,
} from './events.constants';
import { OrderStatus } from 'src/orders/enums/order-status.enum';

@Injectable()
export class EventPublisherService {
  private readonly logger = new Logger(EventPublisherService.name);

  constructor(private readonly gateway: EventsGateway) {}

  notifyDriverAssigned(orderId: string, driverId: string): void {
    const payload: DispatchAssignedPayload = { orderId, driverId };
    try {
      this.gateway.emitToRoom(
        ROOM_DRIVER(driverId),
        EVENT_DISPATCH_ASSIGNED,
        payload,
      );
    } catch (err) {
      this.logger.warn(
        `Publish dispatch:assigned failed for driver=${driverId}`,
        err instanceof Error ? err.stack : undefined,
      );
    }
  }

  notifyCustomerStatusChanged(
    orderId: string,
    status: OrderStatus,
    customerId?: string,
  ): void {
    const payload: OrderStatusChangedPayload = { orderId, status, customerId };
    try {
      this.gateway.emitToRoom(
        ROOM_ORDER(orderId),
        EVENT_ORDER_STATUS_CHANGED,
        payload,
      );
    } catch (err) {
      this.logger.warn(
        `Publish order:status_changed failed for order=${orderId}`,
        err instanceof Error ? err.stack : undefined,
      );
    }
  }
}
