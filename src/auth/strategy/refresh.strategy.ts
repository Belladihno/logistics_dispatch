import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { InjectRepository } from '@nestjs/typeorm';
import { Request } from 'express';
import { Strategy } from 'passport-custom';
import { User } from 'src/users/entities/user.entity';
import { Repository } from 'typeorm';
import { TokenService } from '../services/token.service';
import { JwtUser } from './jwt.strategy';

export interface RequestWithCookies extends Request {
  cookies: {
    refreshToken?: string;
  };
  body: {
    refresh_token?: string;
  };
}

@Injectable()
export class RefreshStrategy extends PassportStrategy(Strategy, 'refresh') {
  constructor(
    private readonly tokenService: TokenService,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
  ) {
    super();
  }

  async validate(req: RequestWithCookies): Promise<JwtUser> {
    const authHeader = req.headers?.authorization;
    const bearerToken = authHeader?.startsWith('Bearer ')
      ? authHeader.slice(7)
      : undefined;

    const refreshToken =
      req.cookies?.refreshToken ?? req.body?.refresh_token ?? bearerToken;

    if (!refreshToken)
      throw new UnauthorizedException('Refresh token not found');

    const userId = await this.tokenService.verifyRefreshToken(refreshToken);

    const user = await this.userRepo.findOneBy({ id: userId });

    if (!user) throw new UnauthorizedException('User does not exists!');
    if (!user.isEmailVerified)
      throw new UnauthorizedException('Please verify your email first');

    const driverProfileId = await this.tokenService.resolveDriverProfileId(
      user.id,
      user.role,
    );

    return {
      userId: user.id,
      email: user.email,
      role: user.role,
      driverProfileId,
    };
  }
}
