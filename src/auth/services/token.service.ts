import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { User } from 'src/users/entities/user.entity';
import { JwtPayload } from '../strategy/jwt.strategy';
import { randomBytes } from 'crypto';
import { Hash, verifyHash } from 'src/common/utils/hash.utils';
import type { StringValue } from 'ms';
import { RedisService } from 'src/redis/redis.service';

@Injectable()
export class TokenService {
  private readonly REFRESH_TTL = 60 * 60 * 24 * 7;

  constructor(
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly redisService: RedisService,
  ) {}

  async generateTokens(user: User): Promise<{
    accessToken: string;
    refreshToken: string;
  }> {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
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

  async verifyRefreshToken(incomingRefreshToken: string): Promise<string> {
    const [tokenOwnerUserId, tokenSecretPart] = incomingRefreshToken.split(
      '.',
      2,
    );

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

    return tokenOwnerUserId;
  }
}
