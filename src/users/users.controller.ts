import { Controller, Get, Body, Patch, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from './entities/user.entity';
import { ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user profile' })
  @ApiResponse({ status: 200, description: 'User name updated successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  getUserProfile(@CurrentUser() user: User) {
    return this.usersService.getUserProfile(user.id);
  }

  @Patch('me/name')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update user name' })
  @ApiResponse({ status: 200, description: 'User name updated successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  updateUsername(@CurrentUser() user: User, @Body() dto: UpdateUserDto) {
    return this.usersService.updateUserName(user.id, dto);
  }
}
