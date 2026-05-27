import { Controller, Post, Body, Get, UseGuards, Query } from '@nestjs/common';
import { AuthService } from '../services/auth.service';
import { RegisterDto } from '../dto/register.dto';
import { LoginDto } from '../dto/login.dto';
import { Public } from '../decorators/public.decorator';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { CurrentUser } from '../decorators/current-user.decorator';
import type { JwtUser } from '../strategy/jwt.strategy';
import { RefreshAuthGuard } from '../guards/refresh-auth.guard';
import { Roles } from '../decorators/roles.decorator';
import { UserRole } from 'src/users/enums/user-role.enum';
import { RolesGuard } from '../guards/roles.guard';
import { AuthGuard } from '@nestjs/passport';
import type { GoogleAuthUser } from '../strategy/google.strategy';
import { VerifyEmailDto } from '../dto/verify-email.dto';
import { ResendVerificationEmailDto } from '../dto/resend-verification-email.dto';
import { ForgotPasswordDto } from '../dto/forgot-password.dto';
import { ResetPasswordDto } from '../dto/reset-password.dto';
import { Throttle } from '@nestjs/throttler';
import { ApiTags } from '@nestjs/swagger';
import { throttleConfig } from 'src/common/throttler/throttle.config';
import {
  ApiAuthAdminPingDocs,
  ApiAuthForgotPasswordDocs,
  ApiAuthGoogleCallbackDocs,
  ApiAuthGoogleLoginDocs,
  ApiAuthLoginDocs,
  ApiAuthRefreshDocs,
  ApiAuthRegisterDocs,
  ApiAuthResendVerificationEmailDocs,
  ApiAuthResetPasswordDocs,
  ApiAuthVerifyEmailDocs,
  ApiAuthVerifyEmailFromLinkDocs,
} from '../docs/decorators/auth-swagger.decorators';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  @Throttle({
    default: {
      limit: throttleConfig.auth.register.limit,
      ttl: throttleConfig.auth.register.ttlMs,
      blockDuration: throttleConfig.auth.register.blockMs,
    },
  })
  @ApiAuthRegisterDocs()
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Public()
  @Post('login')
  @Throttle({
    default: {
      limit: throttleConfig.auth.login.limit,
      ttl: throttleConfig.auth.login.ttlMs,
      blockDuration: throttleConfig.auth.login.blockMs,
    },
  })
  @ApiAuthLoginDocs()
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Public()
  @Post('verify-email')
  @ApiAuthVerifyEmailDocs()
  verifyEmail(@Body() dto: VerifyEmailDto) {
    return this.authService.verifyEmail(dto);
  }

  @Public()
  @Get('verify-email')
  @ApiAuthVerifyEmailFromLinkDocs()
  verifyEmailFromLink(@Query('token') token: string) {
    return this.authService.verifyEmail({ token });
  }

  @Public()
  @Post('resend-verification-email')
  @Throttle({
    default: {
      limit: throttleConfig.auth.resendVerificationEmail.limit,
      ttl: throttleConfig.auth.resendVerificationEmail.ttlMs,
      blockDuration: throttleConfig.auth.resendVerificationEmail.blockMs,
    },
  })
  @ApiAuthResendVerificationEmailDocs()
  resendVerificationEmail(@Body() dto: ResendVerificationEmailDto) {
    return this.authService.resendVerificationEmail(dto);
  }

  @Public()
  @Post('forgot-password')
  @Throttle({
    default: {
      limit: throttleConfig.auth.forgotPassword.limit,
      ttl: throttleConfig.auth.forgotPassword.ttlMs,
      blockDuration: throttleConfig.auth.forgotPassword.blockMs,
    },
  })
  @ApiAuthForgotPasswordDocs()
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    const message = await this.authService.forgotPassword(dto);
    return { message };
  }

  @Public()
  @Post('reset-password')
  @ApiAuthResetPasswordDocs()
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  @Public()
  @Get('google')
  @ApiAuthGoogleLoginDocs()
  @UseGuards(AuthGuard('google'))
  googleLogin() {
    return { message: 'Redirecting to Google login' };
  }

  @Public()
  @Get('google/callback')
  @ApiAuthGoogleCallbackDocs()
  @UseGuards(AuthGuard('google'))
  googleCallback(@CurrentUser() googleUser: GoogleAuthUser) {
    return this.authService.loginWithGoogle(googleUser);
  }

  @Public()
  @UseGuards(RefreshAuthGuard)
  @Post('refresh')
  @Throttle({
    default: {
      limit: throttleConfig.auth.refresh.limit,
      ttl: throttleConfig.auth.refresh.ttlMs,
      blockDuration: throttleConfig.auth.refresh.blockMs,
    },
  })
  @ApiAuthRefreshDocs()
  refresh(@CurrentUser() user: JwtUser) {
    return this.authService.refreshTokens(user);
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  logout(@CurrentUser() user: JwtUser) {
    return this.authService.logout(user);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Get('admin/ping')
  @ApiAuthAdminPingDocs()
  adminPing() {
    return { message: 'Admin access granted' };
  }
}
