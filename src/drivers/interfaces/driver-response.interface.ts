import { VehincleType } from '../enums/vehincle-type.enum';

export interface DriverResponse {
  id: string;
  userId: string;
  name: string;
  email: string;
  vehincleType: VehincleType;
  licenseNumber: string;
  onlineStatus: boolean;
  currentLatitude: number | null;
  currentLongitude: number | null;
  rating: number;
  isSuspended: boolean;
  createdAt: Date;
  updatedAt: Date;
}
