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
import { Throttle } from '@nestjs/throttler';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConflictResponse,
  ApiOkResponse,
  ApiOperation,
  ApiProperty,
  ApiPropertyOptional,
  ApiQuery,
  ApiServiceUnavailableResponse,
  ApiTags,
  ApiTooManyRequestsResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { AuthProvider } from '../enums/auth-provider';
import { throttleConfig } from 'src/common/throttler/throttle.config';

class AuthUserResponseDto {
  @ApiProperty({
    example: '0196c4ad-9f14-7b31-bdea-5fa403bd9e8b',
    description: 'User id',
  })
  id!: string;

  @ApiProperty({ example: 'John Doe', description: 'User display name' })
  name!: string;

  @ApiProperty({
    example: 'john@example.com',
    description: 'User email address',
  })
  email!: string;

  @ApiProperty({ enum: UserRole, example: UserRole.CUSTOMER })
  role!: UserRole;

  @ApiProperty({ enum: AuthProvider, example: AuthProvider.LOCAL })
  provider!: AuthProvider;
}

class AuthResponseDto {
  @ApiProperty({ type: AuthUserResponseDto })
  user!: AuthUserResponseDto;

  @ApiProperty({
    example: '<jwt_access_token>',
    description: 'JWT access token',
  })
  accessToken!: string;

  @ApiProperty({
    example: '<refresh_token>',
    description: 'Refresh token',
  })
  refreshToken!: string;

  @ApiPropertyOptional({
    example: true,
    description: 'Present on registration when email verification is required',
  })
  emailVerificationRequired?: boolean;
}

class MessageResponseDto {
  @ApiProperty({ example: 'Email verified successfully' })
  message!: string;
}

class RefreshRequestDto {
  @ApiPropertyOptional({
    example: '<refresh_token>',
    description: 'Optional when sending refresh token in request body',
  })
  refresh_token?: string;
}

class MeResponseDto {
  @ApiProperty({
    example: '0196c4ad-9f14-7b31-bdea-5fa403bd9e8b',
  })
  userId!: string;

  @ApiProperty({ example: 'john@example.com' })
  email!: string;

  @ApiProperty({ enum: UserRole, example: UserRole.CUSTOMER })
  role!: UserRole;
}

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
  @ApiOperation({ summary: 'Register a new user account' })
  @ApiBody({ type: RegisterDto })
  @ApiOkResponse({
    type: AuthResponseDto,
    description:
      'User registered successfully. Returns JWT tokens and verification requirement metadata.',
  })
  @ApiConflictResponse({ description: 'Email already in use' })
  @ApiServiceUnavailableResponse({
    description: 'Verification email could not be sent at this time',
  })
  @ApiTooManyRequestsResponse({
    description: 'Too many registration attempts. Please try again later.',
  })
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
  @ApiOperation({ summary: 'Login with email and password' })
  @ApiBody({ type: LoginDto })
  @ApiOkResponse({
    type: AuthResponseDto,
    description:
      'User authenticated successfully. Returns access and refresh tokens.',
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid credentials or email is not verified.',
  })
  @ApiTooManyRequestsResponse({
    description: 'Too many login attempts. Please try again later.',
  })
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Public()
  @Post('verify-email')
  @ApiOperation({ summary: 'Verify user email with a token' })
  @ApiBody({ type: VerifyEmailDto })
  @ApiOkResponse({
    type: MessageResponseDto,
    description: 'Email verified successfully',
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid, missing, or expired verification token',
  })
  verifyEmail(@Body() dto: VerifyEmailDto) {
    return this.authService.verifyEmail(dto);
  }

  @Public()
  @Get('verify-email')
  @ApiOperation({ summary: 'Verify user email from verification link' })
  @ApiQuery({
    name: 'token',
    required: true,
    description: 'Email verification token from the email link',
    example: '<email_verification_token>',
  })
  @ApiOkResponse({
    type: MessageResponseDto,
    description: 'Email verified successfully',
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid, missing, or expired verification token',
  })
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
  @ApiOperation({ summary: 'Resend verification email' })
  @ApiBody({ type: ResendVerificationEmailDto })
  @ApiOkResponse({
    type: MessageResponseDto,
    description: 'Returns a generic response to avoid email enumeration.',
  })
  @ApiServiceUnavailableResponse({
    description: 'Verification email could not be sent at this time',
  })
  @ApiTooManyRequestsResponse({
    description:
      'Too many resend verification requests. Please try again later.',
  })
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
  @ApiOperation({ summary: 'Request password reset email' })
  @ApiBody({ type: ForgotPasswordDto })
  @ApiOkResponse({
    type: MessageResponseDto,
    description: 'Returns a generic response to avoid email enumeration.',
  })
  @ApiServiceUnavailableResponse({
    description: 'Password reset email could not be sent at this time',
  })
  @ApiTooManyRequestsResponse({
    description: 'Too many reset requests. Please try again later.',
  })
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    const message = await this.authService.forgotPassword(dto);
    return { message };
  }

  @Public()
  @Get('google')
  @ApiOperation({ summary: 'Start Google OAuth login' })
  @ApiOkResponse({
    type: MessageResponseDto,
    description: 'Redirects user to Google OAuth consent page',
  })
  @UseGuards(AuthGuard('google'))
  googleLogin() {
    return { message: 'Redirecting to Google login' };
  }

  @Public()
  @Get('google/callback')
  @ApiOperation({ summary: 'Google OAuth callback endpoint' })
  @ApiOkResponse({
    type: AuthResponseDto,
    description: 'Completes Google auth and returns access and refresh tokens.',
  })
  @ApiConflictResponse({
    description: 'Email already registered with password login',
  })
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
  @ApiOperation({
    summary: 'Refresh access token',
    description:
      'Refresh token can be provided in Authorization Bearer header, request body `refresh_token`, or cookie `refreshToken`.',
  })
  @ApiBody({ type: RefreshRequestDto })
  @ApiOkResponse({
    type: AuthResponseDto,
    description: 'Returns a new access token and refresh token pair.',
  })
  @ApiUnauthorizedResponse({
    description: 'Refresh token is missing, malformed, expired, or invalid',
  })
  @ApiTooManyRequestsResponse({
    description: 'Too many refresh attempts. Please try again later.',
  })
  refresh(@CurrentUser() user: JwtUser) {
    return this.authService.refreshTokens(user);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get current authenticated user profile' })
  @ApiOkResponse({
    type: MeResponseDto,
    description: 'Authenticated user payload',
  })
  @ApiUnauthorizedResponse({
    description: 'Missing or invalid access token',
  })
  me(@CurrentUser() user: JwtUser) {
    return user;
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Get('admin/ping')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Admin-only health/authorization check endpoint' })
  @ApiOkResponse({
    type: MessageResponseDto,
    description: 'Admin access granted',
  })
  @ApiUnauthorizedResponse({
    description: 'Missing/invalid token or insufficient role permissions',
  })
  adminPing() {
    return { message: 'Admin access granted' };
  }
}
