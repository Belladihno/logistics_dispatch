import { OrderStatus } from '../orders/enums/order-status.enum';

export const EVENT_DISPATCH_ASSIGNED = 'dispatch:assigned';
export const EVENT_ORDER_STATUS_CHANGED = 'order:status_changed';
export const EVENT_JOIN_ROOM = 'join';
export const EVENT_JOIN_ACK = 'join:ack';
export const EVENT_JOIN_ERROR = 'join:error';
export const EVENT_DISPATCH_TIMEOUT = 'dispatch:timeout';
export const EVENT_DRIVER_LOCATION_UPDATE = 'driver:location_update';
export const EVENT_ORDER_LOCATION_BROADCAST = 'order:location_broadcast';

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

export interface DispatchTimeoutPayload {
  orderId: string;
}

export interface DriverLocationUpdatePayload {
  lat: number;
  lng: number;
  orderId?: string;
}

export interface OrderLocationBroadcastPayload {
  orderId: string;
  lat: number;
  lng: number;
  eta?: number;
}

export const ROOM_DRIVER = (driverId: string) => `driver:${driverId}`;
export const ROOM_ORDER = (orderId: string) => `order:${orderId}`;

export interface JoinRoomPayload {
  token: string;
  orderId?: string;
  orderIds?: string[];
}
