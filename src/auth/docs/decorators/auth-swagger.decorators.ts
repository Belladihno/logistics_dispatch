import { applyDecorators } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConflictResponse,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiServiceUnavailableResponse,
  ApiTooManyRequestsResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { RegisterDto } from '../../dto/register.dto';
import { LoginDto } from '../../dto/login.dto';
import { VerifyEmailDto } from '../../dto/verify-email.dto';
import { ResendVerificationEmailDto } from '../../dto/resend-verification-email.dto';
import { ForgotPasswordDto } from '../../dto/forgot-password.dto';
import {
  AuthResponseDto,
  MessageResponseDto,
  RefreshRequestDto,
} from '../models/auth-doc.models';

export const ApiAuthRegisterDocs = () =>
  applyDecorators(
    ApiOperation({ summary: 'Register a new user account' }),
    ApiBody({ type: RegisterDto }),
    ApiOkResponse({
      type: AuthResponseDto,
      description:
        'User registered successfully. Returns JWT tokens and verification requirement metadata.',
    }),
    ApiConflictResponse({ description: 'Email already in use' }),
    ApiServiceUnavailableResponse({
      description: 'Verification email could not be sent at this time',
    }),
    ApiTooManyRequestsResponse({
      description: 'Too many registration attempts. Please try again later.',
    }),
  );

export const ApiAuthLoginDocs = () =>
  applyDecorators(
    ApiOperation({ summary: 'Login with email and password' }),
    ApiBody({ type: LoginDto }),
    ApiOkResponse({
      type: AuthResponseDto,
      description:
        'User authenticated successfully. Returns access and refresh tokens.',
    }),
    ApiUnauthorizedResponse({
      description: 'Invalid credentials or email is not verified.',
    }),
    ApiTooManyRequestsResponse({
      description: 'Too many login attempts. Please try again later.',
    }),
  );

export const ApiAuthVerifyEmailDocs = () =>
  applyDecorators(
    ApiOperation({ summary: 'Verify user email with a token' }),
    ApiBody({ type: VerifyEmailDto }),
    ApiOkResponse({
      type: MessageResponseDto,
      description: 'Email verified successfully',
    }),
    ApiUnauthorizedResponse({
      description: 'Invalid, missing, or expired verification token',
    }),
  );

export const ApiAuthVerifyEmailFromLinkDocs = () =>
  applyDecorators(
    ApiOperation({ summary: 'Verify user email from verification link' }),
    ApiQuery({
      name: 'token',
      required: true,
      description: 'Email verification token from the email link',
      example: '<email_verification_token>',
    }),
    ApiOkResponse({
      type: MessageResponseDto,
      description: 'Email verified successfully',
    }),
    ApiUnauthorizedResponse({
      description: 'Invalid, missing, or expired verification token',
    }),
  );

export const ApiAuthResendVerificationEmailDocs = () =>
  applyDecorators(
    ApiOperation({ summary: 'Resend verification email' }),
    ApiBody({ type: ResendVerificationEmailDto }),
    ApiOkResponse({
      type: MessageResponseDto,
      description: 'Returns a generic response to avoid email enumeration.',
    }),
    ApiServiceUnavailableResponse({
      description: 'Verification email could not be sent at this time',
    }),
    ApiTooManyRequestsResponse({
      description:
        'Too many resend verification requests. Please try again later.',
    }),
  );

export const ApiAuthForgotPasswordDocs = () =>
  applyDecorators(
    ApiOperation({ summary: 'Request password reset email' }),
    ApiBody({ type: ForgotPasswordDto }),
    ApiOkResponse({
      type: MessageResponseDto,
      description: 'Returns a generic response to avoid email enumeration.',
    }),
    ApiServiceUnavailableResponse({
      description: 'Password reset email could not be sent at this time',
    }),
    ApiTooManyRequestsResponse({
      description: 'Too many reset requests. Please try again later.',
    }),
  );

export const ApiAuthGoogleLoginDocs = () =>
  applyDecorators(
    ApiOperation({ summary: 'Start Google OAuth login' }),
    ApiOkResponse({
      type: MessageResponseDto,
      description: 'Redirects user to Google OAuth consent page',
    }),
  );

export const ApiAuthGoogleCallbackDocs = () =>
  applyDecorators(
    ApiOperation({ summary: 'Google OAuth callback endpoint' }),
    ApiOkResponse({
      type: AuthResponseDto,
      description:
        'Completes Google auth and returns access and refresh tokens.',
    }),
    ApiConflictResponse({
      description: 'Email already registered with password login',
    }),
  );

export const ApiAuthRefreshDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Refresh access token',
      description:
        'Refresh token can be provided in Authorization Bearer header, request body `refresh_token`, or cookie `refreshToken`.',
    }),
    ApiBody({ type: RefreshRequestDto }),
    ApiOkResponse({
      type: AuthResponseDto,
      description: 'Returns a new access token and refresh token pair.',
    }),
    ApiUnauthorizedResponse({
      description: 'Refresh token is missing, malformed, expired, or invalid',
    }),
    ApiTooManyRequestsResponse({
      description: 'Too many refresh attempts. Please try again later.',
    }),
  );

export const ApiAuthAdminPingDocs = () =>
  applyDecorators(
    ApiBearerAuth('access-token'),
    ApiOperation({ summary: 'Admin-only health/authorization check endpoint' }),
    ApiOkResponse({
      type: MessageResponseDto,
      description: 'Admin access granted',
    }),
    ApiUnauthorizedResponse({
      description: 'Missing/invalid token or insufficient role permissions',
    }),
  );
