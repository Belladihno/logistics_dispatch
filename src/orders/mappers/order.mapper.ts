import { Order } from '../entities/order.entity';
import { OrderResponse } from '../interfaces/order-response.interface';

export const toOrderResponse = (order: Order): OrderResponse => {
  return {
    id: order.id,
    customerId: order.customerId,
    orderType: order.orderType,
    vehincleType: order.vehincleType,
    pickupAddress: order.pickupAddress,
    pickupLatitude: Number(order.pickupLatitude),
    pickupLongitude: Number(order.pickupLongitude),
    deliveryAddress: order.deliveryAddress,
    deliveryLatitude: Number(order.deliveryLatitude),
    deliveryLongitude: Number(order.deliveryLongitude),
    notes: order.notes,
    status: order.orderStatus,
    assignedDriverId: order.assignedDriverId,
    estimatedPrice: Number(order.estimatedPrice),
    dispatchAttempts: order.dispatchAttempts,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
  };
};
