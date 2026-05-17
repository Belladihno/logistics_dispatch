import { Injectable, NotFoundException } from '@nestjs/common';
import { UpdateUserDto } from './dto/update-user.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { Repository } from 'typeorm';
import { UserRole } from './enums/user-role.enum';
import { AuthProvider } from 'src/auth/enums/auth-provider';

export interface UserResponse {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  provider: AuthProvider;
  verified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class UsersService {
  constructor(@InjectRepository(User) private userRepo: Repository<User>) {}

  async getUserProfile(id: string): Promise<UserResponse> {
    const user = await this.userRepo.findOneBy({ id });

    if (!user) throw new NotFoundException('User not found');

    return this.userResponse(user);
  }

  async updateUserName(id: string, dto: UpdateUserDto): Promise<UserResponse> {
    const user = await this.userRepo.findOneBy({ id });

    if (!user) throw new NotFoundException('User not found');

    user.name = dto.name;

    const updated = await this.userRepo.save(user);

    return this.userResponse(updated);
  }

  private userResponse(user: User): UserResponse {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      provider: user.provider,
      verified: user.isEmailVerified,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
