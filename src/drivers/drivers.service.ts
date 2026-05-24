import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Driver } from './entities/driver.entity';
import { Repository } from 'typeorm';
import { JwtUser } from 'src/auth/strategy/jwt.strategy';
import { DriverResponse } from './interfaces/driver-response.interface';
import { toDriverResponse } from './mappers/driver.mapper';
import { UpdateLocationDto } from './dto/update-location.dto';

@Injectable()
export class DriversService {
  private static readonly MAX_LIMIT = 100;

  constructor(
    @InjectRepository(Driver)
    private readonly driverRepo: Repository<Driver>,
  ) {}

  async getMyProfile(user: JwtUser): Promise<DriverResponse> {
    const driver = await this.driverRepo.findOne({
      where: { userId: user.userId },
      relations: { user: true },
    });

    if (!driver) throw new NotFoundException('Driver profile not found');

    return toDriverResponse(driver);
  }

  async toggleAvailability(user: JwtUser): Promise<DriverResponse> {
    const driver = await this.driverRepo.findOne({
      where: { userId: user.userId },
      relations: { user: true },
    });

    if (!driver) throw new NotFoundException('Driver profile not found');

    if (driver.isSuspended && !driver.onlineStatus) {
      throw new ForbiddenException(
        'Your account is suspended, you cannot go online',
      );
    }

    driver.onlineStatus = !driver.onlineStatus;

    const updated = await this.driverRepo.save(driver);

    return toDriverResponse(updated);
  }

  async updateLocation(
    user: JwtUser,
    dto: UpdateLocationDto,
  ): Promise<{ message: string }> {
    const driver = await this.driverRepo.findOneBy({ userId: user.userId });

    if (!driver) throw new NotFoundException('Driver profile not found');

    await this.driverRepo.update(driver.id, {
      currentLatitude: dto.latitude,
      currentLongitude: dto.longitude,
    });

    return { message: 'Location updated successfully' };
  }

  async findAll(
    limit: number = 20,
    cursor?: string,
    onlineOnly?: boolean,
  ): Promise<{
    data: DriverResponse[];
    nextCursor: string | null;
    hasNextPage: boolean;
  }> {
    const safeLimit = Math.min(Math.max(limit, 1), DriversService.MAX_LIMIT);

    const query = this.driverRepo
      .createQueryBuilder('driver')
      .leftJoinAndSelect('driver.user', 'user')
      .orderBy('driver.createdAt', 'DESC')
      .addOrderBy('driver.id', 'DESC')
      .take(safeLimit + 1);

    if (onlineOnly) {
      query.where('driver.onlineStatus = :onlineStatus', {
        onlineStatus: true,
      });
    }

    if (cursor) {
      const decoded = this.decodeCursor(cursor);
      query.andWhere('(driver.createdAt, driver.id) < (:createdAt, :id)', {
        createdAt: decoded.createdAt,
        id: decoded.id,
      });
    }

    const drivers = await query.getMany();

    const hasNextPage = drivers.length > safeLimit;
    if (hasNextPage) drivers.pop();

    const nextCursor = hasNextPage
      ? this.encodeCursor(drivers[drivers.length - 1])
      : null;

    return {
      data: drivers.map(toDriverResponse),
      nextCursor,
      hasNextPage,
    };
  }

  async findById(driverId: string): Promise<DriverResponse> {
    const driver = await this.driverRepo.findOne({
      where: { id: driverId },
      relations: { user: true },
    });

    if (!driver) throw new NotFoundException('Driver not found');

    return toDriverResponse(driver);
  }

  async toggleSuspension(driverId: string): Promise<DriverResponse> {
    const driver = await this.driverRepo.findOne({
      where: { id: driverId },
      relations: { user: true },
    });

    if (!driver) throw new NotFoundException('Driver not found');

    if (!driver.isSuspended && driver.onlineStatus) {
      driver.onlineStatus = false;
    }

    driver.isSuspended = !driver.isSuspended;

    const updated = await this.driverRepo.save(driver);

    return toDriverResponse(updated);
  }

  private encodeCursor(driver: Driver): string {
    const payload = JSON.stringify({
      createdAt: driver.createdAt,
      id: driver.id,
    });
    return Buffer.from(payload).toString('base64');
  }

  private decodeCursor(cursor: string): { createdAt: Date; id: string } {
    try {
      const payload = Buffer.from(cursor, 'base64').toString('utf8');
      const decoded = JSON.parse(payload) as {
        createdAt: string;
        id: string;
      };

      if (!decoded?.createdAt || !decoded?.id) {
        throw new UnprocessableEntityException('Invalid pagination cursor');
      }

      const createdAt = new Date(decoded.createdAt);
      if (Number.isNaN(createdAt.getTime())) {
        throw new UnprocessableEntityException('Invalid pagination cursor');
      }

      return { createdAt, id: decoded.id };
    } catch {
      throw new UnprocessableEntityException('Invalid pagination cursor');
    }
  }
}
