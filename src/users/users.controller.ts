import {
  Controller,
  Get,
  Body,
  Patch,
  Post,
  UseGuards,
  Param,
  ParseUUIDPipe,
  Query,
  DefaultValuePipe,
  ParseIntPipe,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { PromoteToDriverDto } from './dto/promote-to-driver.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { JwtUser } from '../auth/strategy/jwt.strategy';
import { ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from './enums/user-role.enum';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'List all users (admin)' })
  @ApiResponse({ status: 200, description: 'Paginated list of users' })
  findAll(
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('cursor') cursor?: string,
  ) {
    return this.usersService.findAll(limit, cursor);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get user by ID (admin)' })
  @ApiResponse({ status: 200, description: 'User found' })
  @ApiResponse({ status: 404, description: 'User not found' })
  findById(@Param('id', ParseUUIDPipe) id: string) {
    return this.usersService.getUserProfile(id);
  }

  @Get('me')
  @Roles(UserRole.CUSTOMER, UserRole.DRIVER, UserRole.ADMIN)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({
    status: 200,
    description: 'User profile returned successfully',
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  getUserProfile(@CurrentUser() user: JwtUser) {
    return this.usersService.getUserProfile(user.userId);
  }

  @Patch('me/name')
  @Roles(UserRole.CUSTOMER, UserRole.DRIVER, UserRole.ADMIN)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Update current user name' })
  @ApiResponse({ status: 200, description: 'User name updated successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  updateUsername(@CurrentUser() user: JwtUser, @Body() dto: UpdateUserDto) {
    return this.usersService.updateUserName(user.userId, dto);
  }

  @Post(':id/promote-to-driver')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Promote a user to driver role' })
  @ApiResponse({ status: 200, description: 'User promoted to driver' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 409, description: 'User is already a driver' })
  promoteToDriver(
    @Param('id', ParseUUIDPipe) userId: string,
    @Body() dto: PromoteToDriverDto,
  ) {
    return this.usersService.promoteToDriver(userId, dto);
  }
}
