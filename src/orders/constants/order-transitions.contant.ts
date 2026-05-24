import { OrderStatus } from '../enums/order-status.enum';

export const ORDER_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  [OrderStatus.PENDING]: [
    OrderStatus.DRIVER_ASSIGNED,
    OrderStatus.CANCELLED,
    OrderStatus.EXPIRED,
  ],
  [OrderStatus.DRIVER_ASSIGNED]: [
    OrderStatus.DRIVER_ARRIVING,
    OrderStatus.CANCELLED,
  ],
  [OrderStatus.DRIVER_ARRIVING]: [OrderStatus.PICKED_UP, OrderStatus.CANCELLED],
  [OrderStatus.PICKED_UP]: [OrderStatus.IN_TRANSIT],
  [OrderStatus.IN_TRANSIT]: [OrderStatus.DELIVERED, OrderStatus.FAILED],
  [OrderStatus.DELIVERED]: [],
  [OrderStatus.CANCELLED]: [],
  [OrderStatus.FAILED]: [],
  [OrderStatus.EXPIRED]: [],
};
