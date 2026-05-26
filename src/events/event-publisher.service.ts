import { Injectable, Logger } from '@nestjs/common';
import { EventsGateway } from './events.gateway';
import {
  DispatchAssignedPayload,
  EVENT_DISPATCH_ASSIGNED,
  EVENT_DISPATCH_TIMEOUT,
  EVENT_ORDER_STATUS_CHANGED,
  EVENT_ORDER_LOCATION_BROADCAST,
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
      const trace = err instanceof Error ? err.stack : String(err);
      this.logger.warn(
        `Publish dispatch:assigned failed for driver=${driverId}`,
        trace,
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
      const trace = err instanceof Error ? err.stack : String(err);
      this.logger.warn(
        `Publish order:status_changed failed for order=${orderId}`,
        trace,
      );
    }
  }

  notifyDriverTimeout(orderId: string, driverId: string): void {
    const payload = { orderId };
    try {
      this.gateway.emitToRoom(
        ROOM_DRIVER(driverId),
        EVENT_DISPATCH_TIMEOUT,
        payload,
      );
    } catch (err) {
      const trace = err instanceof Error ? err.stack : String(err);
      this.logger.warn(
        `Publish dispatch:timeout failed for driver=${driverId}`,
        trace,
      );
    }
  }

  notifyLocationBroadcast(
    orderId: string,
    lat: number,
    lng: number,
    eta?: number,
  ): void {
    const payload = { orderId, lat, lng, eta };
    try {
      this.gateway.emitToRoom(
        ROOM_ORDER(orderId),
        EVENT_ORDER_LOCATION_BROADCAST,
        payload,
      );
    } catch (err) {
      const trace = err instanceof Error ? err.stack : String(err);
      this.logger.warn(
        `Publish order:location_broadcast failed for order=${orderId}`,
        trace,
      );
    }
  }
}
