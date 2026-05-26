import {
  Body,
  Controller,
  Delete,
  DefaultValuePipe,
  Get,
  Headers,
  Param,
  ParseEnumPipe,
  ParseIntPipe,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiHeader } from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { UserRole } from 'src/users/enums/user-role.enum';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';
import type { JwtUser } from 'src/auth/strategy/jwt.strategy';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrderStatus } from './enums/order-status.enum';

@Controller('orders')
@UseGuards(JwtAuthGuard, RolesGuard)
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @Roles(UserRole.CUSTOMER)
  @ApiHeader({
    name: 'idempotency-key',
    required: false,
    description:
      'Client-provided idempotency key to deduplicate order creation within 24 hours',
  })
  createOrder(
    @Body() dto: CreateOrderDto,
    @CurrentUser() user: JwtUser,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    return this.ordersService.createOrder(dto, user.userId, idempotencyKey);
  }

  @Get(':id')
  @Roles(UserRole.CUSTOMER, UserRole.ADMIN, UserRole.DRIVER)
  findById(
    @Param('id', ParseUUIDPipe) orderId: string,
    @CurrentUser() user: JwtUser,
  ) {
    return this.ordersService.findById(orderId, user);
  }

  @Get()
  @Roles(UserRole.CUSTOMER, UserRole.ADMIN)
  findAll(
    @CurrentUser() user: JwtUser,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('cursor') cursor?: string,
    @Query('status', new ParseEnumPipe(OrderStatus, { optional: true }))
    status?: OrderStatus,
  ) {
    return this.ordersService.findAll(user, limit, cursor, status);
  }

  @Patch(':id/status')
  @Roles(UserRole.DRIVER, UserRole.ADMIN)
  updateStatus(
    @Param('id', ParseUUIDPipe) orderId: string,
    @Body() dto: UpdateOrderStatusDto,
    @CurrentUser() user: JwtUser,
  ) {
    return this.ordersService.updateStatus(orderId, dto.status, user);
  }

  @Patch(':id/reassign')
  @Roles(UserRole.ADMIN)
  reassignOrder(
    @Param('id', ParseUUIDPipe) orderId: string,
    @CurrentUser() user: JwtUser,
  ) {
    return this.ordersService.reassignOrder(orderId, user);
  }

  @Patch(':id/cancel')
  @Roles(UserRole.CUSTOMER, UserRole.ADMIN)
  cancelOrder(
    @Param('id', ParseUUIDPipe) orderId: string,
    @CurrentUser() user: JwtUser,
  ) {
    return this.ordersService.cancelOrder(orderId, user);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  softDelete(
    @Param('id', ParseUUIDPipe) orderId: string,
  ): Promise<{ message: string }> {
    return this.ordersService.softDelete(orderId);
  }
}
