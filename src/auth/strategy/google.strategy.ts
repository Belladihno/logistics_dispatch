import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Profile, Strategy } from 'passport-google-oauth20';

export interface GoogleAuthUser {
  googleId: string;
  email: string;
  name: string;
  emailVerified: boolean;
}

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(config: ConfigService) {
    super({
      clientID: config.get<string>('GOOGLE_CLIENT_ID')!,
      clientSecret: config.get<string>('GOOGLE_CLIENT_SECRET')!,
      callbackURL:
        config.get<string>('GOOGLE_CALLBACK_URL') ||
        'http://localhost:3000/auth/google/callback',
      scope: ['email', 'profile'],
    });
  }

  validate(
    _accessToken: string,
    _refreshToken: string,
    profile: Profile,
  ): GoogleAuthUser {
    const email = profile.emails?.[0]?.value?.toLowerCase().trim();

    if (!email) {
      throw new UnauthorizedException('Google account has no email');
    }

    return {
      googleId: profile.id,
      email,
      name: profile.displayName || email.split('@')[0],
      emailVerified:
        profile._json.email_verified === true ||
        profile.emails?.[0]?.verified === true,
    };
  }
}
