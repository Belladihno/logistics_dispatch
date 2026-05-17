import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class VerifyEmailDto {
  @ApiProperty({
    example: '<email_verification_token>',
    description: 'Email verification token sent to the user email',
  })
  @IsString()
  @IsNotEmpty()
  token!: string;
}
