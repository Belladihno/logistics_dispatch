import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from 'src/users/enums/user-role.enum';
import { AuthProvider } from '../../enums/auth-provider';

export class AuthUserResponseDto {
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

export class AuthResponseDto {
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

export class MessageResponseDto {
  @ApiProperty({ example: 'Email verified successfully' })
  message!: string;
}

export class RefreshRequestDto {
  @ApiPropertyOptional({
    example: '<refresh_token>',
    description: 'Optional when sending refresh token in request body',
  })
  refresh_token?: string;
}
