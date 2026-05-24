import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { User } from 'src/users/entities/user.entity';
import { JwtPayload } from '../strategy/jwt.strategy';
import { randomBytes } from 'crypto';
import { Hash, verifyHash } from 'src/common/utils/hash.utils';
import type { StringValue } from 'ms';
import { RedisService } from 'src/redis/redis.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Driver } from 'src/drivers/entities/driver.entity';
import { UserRole } from 'src/users/enums/user-role.enum';
import { Repository } from 'typeorm';

@Injectable()
export class TokenService {
  private readonly REFRESH_TTL = 60 * 60 * 24 * 7;

  constructor(
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly redisService: RedisService,
    @InjectRepository(Driver)
    private readonly driverRepo: Repository<Driver>,
  ) {}

  async generateTokens(user: User): Promise<{
    accessToken: string;
    refreshToken: string;
  }> {
    const driverProfileId = await this.resolveDriverProfileId(
      user.id,
      user.role,
    );

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      driverProfileId,
    };

    const expiresIn = this.config.getOrThrow<string>(
      'JWT_ACCESS_EXPIRY',
    ) as StringValue;

    const accessToken: string = await this.jwtService.signAsync(payload, {
      secret: this.config.getOrThrow<string>('JWT_ACCESS_SECRET'),
      expiresIn,
    });

    const refreshToken = `${user.id}.${randomBytes(64).toString('hex')}`;
    const hashedToken = await Hash(refreshToken);

    await this.redisService.setWithExpiry(
      `refresh:${user.id}`,
      hashedToken,
      this.REFRESH_TTL,
    );

    return { accessToken, refreshToken };
  }

  async resolveDriverProfileId(
    userId: string,
    userRole: UserRole,
  ): Promise<string | null> {
    if (userRole !== UserRole.DRIVER) return null;

    const driverProfile = await this.driverRepo.findOne({
      select: {
        id: true,
      },
      where: {
        userId,
      },
    });

    return driverProfile?.id ?? null;
  }

  async verifyRefreshToken(incomingRefreshToken: string): Promise<string> {
    const separatorIndex = incomingRefreshToken.indexOf('.');
    const tokenOwnerUserId =
      separatorIndex > 0 ? incomingRefreshToken.slice(0, separatorIndex) : '';
    const tokenSecretPart =
      separatorIndex > 0 ? incomingRefreshToken.slice(separatorIndex + 1) : '';

    if (!tokenOwnerUserId || !tokenSecretPart) {
      throw new UnauthorizedException('Malformed refresh token');
    }

    const redisKeyForUserRefreshToken = `refresh:${tokenOwnerUserId}`;
    const storedRefreshTokenHash = await this.redisService.get(
      redisKeyForUserRefreshToken,
    );

    if (!storedRefreshTokenHash) {
      throw new UnauthorizedException('Refresh token expired or revoked');
    }

    const doesTokenMatchStoredHash = await verifyHash(
      storedRefreshTokenHash,
      incomingRefreshToken,
    );

    if (!doesTokenMatchStoredHash) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    await this.redisService.del(redisKeyForUserRefreshToken);

    return tokenOwnerUserId;
  }

  async revokeRefreshToken(userId: string): Promise<void> {
    await this.redisService.del(`refresh:${userId}`);
  }
}
