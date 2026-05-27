import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, MinLength } from 'class-validator';

export class ResetPasswordDto {
  @ApiProperty({
    example: '<password_reset_token>',
    description: 'Password reset token from the email link',
  })
  @IsString()
  @IsNotEmpty()
  token!: string;

  @ApiProperty({
    example: 'NewSecurePass123!',
    description: 'New password (minimum 8 characters)',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  password!: string;
}
