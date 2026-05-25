import { VehincleType } from 'src/drivers/enums/vehincle-type.enum';
import { OrderStatus } from '../enums/order-status.enum';
import { OrderType } from '../enums/order-type.enum';

export interface OrderResponse {
  id: string;
  customerId: string;
  orderType: OrderType;
  vehincleType: VehincleType;
  pickupAddress: string;
  pickupLatitude: number;
  pickupLongitude: number;
  deliveryAddress: string;
  deliveryLatitude: number;
  deliveryLongitude: number;
  notes?: string;
  status: OrderStatus;
  assignedDriverId?: string | null;
  estimatedPrice: number;
  dispatchAttempts: number;
  createdAt: Date;
  updatedAt: Date;
}
