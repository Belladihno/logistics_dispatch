import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  Query,
  ParseUUIDPipe,
  ParseIntPipe,
  ParseBoolPipe,
  DefaultValuePipe,
  UseGuards,
} from '@nestjs/common';
import { DriversService } from './drivers.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';
import { UserRole } from 'src/users/enums/user-role.enum';
import { UpdateLocationDto } from './dto/update-location.dto';
import type { JwtUser } from 'src/auth/strategy/jwt.strategy';

@Controller('drivers')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DriversController {
  constructor(private readonly driversService: DriversService) {}

  @Get('me')
  @Roles(UserRole.DRIVER)
  getMyProfile(@CurrentUser() user: JwtUser) {
    return this.driversService.getMyProfile(user);
  }

  @Patch('me/availability')
  @Roles(UserRole.DRIVER)
  toggleAvailability(@CurrentUser() user: JwtUser) {
    return this.driversService.toggleAvailability(user);
  }

  @Patch('me/location')
  @Roles(UserRole.DRIVER)
  updateLocation(@CurrentUser() user: JwtUser, @Body() dto: UpdateLocationDto) {
    return this.driversService.updateLocation(user, dto);
  }

  @Get()
  @Roles(UserRole.ADMIN)
  findAll(
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('cursor') cursor?: string,
    @Query('onlineOnly', new DefaultValuePipe(false), ParseBoolPipe)
    onlineOnly?: boolean,
  ) {
    return this.driversService.findAll(limit, cursor, onlineOnly);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN)
  findById(@Param('id', ParseUUIDPipe) driverId: string) {
    return this.driversService.findById(driverId);
  }

  @Patch(':id/suspension')
  @Roles(UserRole.ADMIN)
  toggleSuspension(@Param('id', ParseUUIDPipe) driverId: string) {
    return this.driversService.toggleSuspension(driverId);
  }
}
