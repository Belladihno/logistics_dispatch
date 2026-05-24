import { VehincleType } from 'src/drivers/enums/vehincle-type.enum';
import { OrderType } from '../enums/order-type.enum';

export const ORDER_VEHINCLE_MAP: Record<OrderType, VehincleType[]> = {
  [OrderType.PERSON]: [VehincleType.CAR],
  [OrderType.PACKAGE]: [VehincleType.BIKE, VehincleType.CAR],
  [OrderType.GOODS_SMALL]: [VehincleType.CAR, VehincleType.VAN],
  [OrderType.GOODS_LARGE]: [VehincleType.VAN, VehincleType.TRUCK],
};
