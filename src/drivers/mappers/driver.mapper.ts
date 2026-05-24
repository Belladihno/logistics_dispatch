import { Driver } from '../entities/driver.entity';
import { DriverResponse } from '../interfaces/driver-response.interface';

export function toDriverResponse(driver: Driver): DriverResponse {
  return {
    id: driver.id,
    userId: driver.userId,
    name: driver.user.name,
    email: driver.user.email,
    vehincleType: driver.vehincleType,
    licenseNumber: driver.licenseNumber,
    onlineStatus: driver.onlineStatus,
    currentLatitude: driver.currentLatitude
      ? Number(driver.currentLatitude)
      : null,
    currentLongitude: driver.currentLongitude
      ? Number(driver.currentLongitude)
      : null,
    rating: Number(driver.rating),
    isSuspended: driver.isSuspended,
    createdAt: driver.createdAt,
    updatedAt: driver.updatedAt,
  };
}
