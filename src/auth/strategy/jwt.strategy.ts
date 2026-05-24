import { Strategy, ExtractJwt } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from 'src/users/entities/user.entity';
import { Repository } from 'typeorm';
import { UserRole } from 'src/users/enums/user-role.enum';
import type { StrategyOptions } from 'passport-jwt';

export interface JwtPayload {
  sub: string;
  email: string;
  role: UserRole;
  driverProfileId: string | null;
}

export interface JwtUser {
  userId: string;
  email: string;
  role: UserRole;
  driverProfileId: string | null;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    private readonly config: ConfigService,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
  ) {
    const options: StrategyOptions = {
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('JWT_ACCESS_SECRET'),
    };
    super(options);
  }

  async validate(payload: JwtPayload): Promise<JwtUser> {
    const user = await this.userRepo.findOneBy({ id: payload.sub });

    if (!user) throw new UnauthorizedException('Invalid User');
    if (!user.isEmailVerified)
      throw new UnauthorizedException('Please verify your email first');

    return {
      userId: user.id,
      email: user.email,
      role: user.role,
      driverProfileId: payload.driverProfileId,
    };
  }
}
