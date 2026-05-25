import { OrderStatus } from '../orders/enums/order-status.enum';

export const EVENT_DISPATCH_ASSIGNED = 'dispatch:assigned';
export const EVENT_ORDER_STATUS_CHANGED = 'order:status_changed';

export interface DispatchAssignedPayload {
  orderId: string;
  driverId: string;
}

export interface OrderStatusChangedPayload {
  orderId: string;
  status: OrderStatus;
  customerId?: string;
}

export type EventPayloads =
  | { event: typeof EVENT_DISPATCH_ASSIGNED; payload: DispatchAssignedPayload }
  | {
      event: typeof EVENT_ORDER_STATUS_CHANGED;
      payload: OrderStatusChangedPayload;
    };

export const ROOM_DRIVER = (driverId: string) => `driver:${driverId}`;
export const ROOM_ORDER = (orderId: string) => `order:${orderId}`;
