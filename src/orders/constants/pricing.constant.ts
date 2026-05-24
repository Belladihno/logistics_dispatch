import { VehincleType } from 'src/drivers/enums/vehincle-type.enum';

export const PRICING: Record<
  VehincleType,
  { baseFare: number; perKm: number }
> = {
  [VehincleType.BIKE]: { baseFare: 500, perKm: 100 },
  [VehincleType.CAR]: { baseFare: 1000, perKm: 150 },
  [VehincleType.VAN]: { baseFare: 2000, perKm: 200 },
  [VehincleType.TRUCK]: { baseFare: 5000, perKm: 300 },
};
