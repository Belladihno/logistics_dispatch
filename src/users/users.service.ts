import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { UpdateUserDto } from './dto/update-user.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { DataSource, Repository } from 'typeorm';
import { toUserResponse } from './mappers/user.mapper';
import type { UserResponse } from './interfaces/user-response.interface';
import { PromoteToDriverDto } from './dto/promote-to-driver.dto';
import { UserRole } from './enums/user-role.enum';
import { Driver } from 'src/drivers/entities/driver.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private userRepo: Repository<User>,
    private readonly dataSource: DataSource,
  ) {}

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepo.findOneBy({
      email: email.toLowerCase().trim(),
    });
  }

  async findById(id: string): Promise<User | null> {
    return this.userRepo.findOneBy({ id });
  }

  async findAll(
    limit: number,
    cursor?: string,
  ): Promise<{ data: UserResponse[]; nextCursor: string | null }> {
    const query = this.userRepo
      .createQueryBuilder('user')
      .orderBy('user.createdAt', 'DESC')
      .addOrderBy('user.id', 'DESC')
      .take(limit + 1);

    if (cursor) {
      const cursorBuffer = Buffer.from(cursor, 'base64url').toString('utf-8');
      const [cursorCreatedAt, cursorId] = cursorBuffer.split('_');
      query.where(
        '(user.createdAt < :cursorCreatedAt OR (user.createdAt = :cursorCreatedAt AND user.id < :cursorId))',
        { cursorCreatedAt, cursorId },
      );
    }

    const users = await query.getMany();

    const hasMore = users.length > limit;
    if (hasMore) users.pop();

    const nextCursor = hasMore
      ? Buffer.from(
          `${users[users.length - 1].createdAt.toISOString()}_${users[users.length - 1].id}`,
        ).toString('base64url')
      : null;

    return { data: users.map(toUserResponse), nextCursor };
  }

  async getUserProfile(id: string): Promise<UserResponse> {
    const user = await this.userRepo.findOneBy({ id });
    if (!user) throw new NotFoundException('User not found');
    return toUserResponse(user);
  }

  async updateUserName(id: string, dto: UpdateUserDto): Promise<UserResponse> {
    const user = await this.userRepo.findOneBy({ id });
    if (!user) throw new NotFoundException('User not found');

    user.name = dto.name;

    const updated = await this.userRepo.save(user);
    return toUserResponse(updated);
  }

  async promoteToDriver(
    userId: string,
    dto: PromoteToDriverDto,
  ): Promise<UserResponse> {
    const user = await this.userRepo.findOneBy({ id: userId });

    if (!user) throw new NotFoundException('User not found');

    if (user.role === UserRole.DRIVER) {
      throw new ConflictException('User is already a driver');
    }

    if (user.role === UserRole.ADMIN) {
      throw new UnprocessableEntityException(
        'Cannot promote an admin to driver',
      );
    }

    const updated = await this.dataSource.transaction(async (manager) => {
      await manager.update(User, userId, { role: UserRole.DRIVER });

      const existingProfile = await manager.findOneBy(Driver, { userId });
      if (existingProfile) {
        throw new ConflictException('Driver profile already exists');
      }

      const driver = manager.create(Driver, {
        userId,
        vehincleType: dto.vehincleType,
        licenseNumber: dto.licenseNumber,
        onlineStatus: false,
        rating: 5.0,
      });

      await manager.save(Driver, driver);

      return manager.findOneBy(User, { id: userId });
    });

    return toUserResponse(updated!);
  }
}
