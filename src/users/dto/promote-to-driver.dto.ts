import { IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { VehincleType } from 'src/drivers/enums/vehincle-type.enum';

export class PromoteToDriverDto {
  @IsEnum(VehincleType)
  vehicleType!: VehincleType;

  @IsString()
  @IsNotEmpty()
  licenseNumber!: string;
}
