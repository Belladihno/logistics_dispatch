import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DriversController } from './drivers.controller';
import { DriversService } from './drivers.service';
import { Driver } from './entities/driver.entity';
import { UsersModule } from 'src/users/users.module';
import { DispatchModule } from 'src/dispatch/dispatch.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Driver]),
    forwardRef(() => UsersModule),
    DispatchModule,
  ],
  controllers: [DriversController],
  providers: [DriversService],
  exports: [DriversService],
})
export class DriversModule {}
