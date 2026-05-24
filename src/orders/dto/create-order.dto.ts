import {
  IsEnum,
  IsLatitude,
  IsLongitude,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { OrderType } from '../enums/order-type.enum';
import { VehincleType } from 'src/drivers/enums/vehincle-type.enum';

export class CreateOrderDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  pickupAddress!: string;

  @IsLatitude()
  pickupLatitude!: number;

  @IsLongitude()
  pickupLongitude!: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  deliveryAddress!: string;

  @IsLatitude()
  deliveryLatitude!: number;

  @IsLongitude()
  deliveryLongitude!: number;

  @IsEnum(OrderType)
  orderType!: OrderType;

  @IsEnum(VehincleType)
  vehincleType!: VehincleType;

  @IsString()
  @IsOptional()
  @MaxLength(300)
  notes?: string;
}
