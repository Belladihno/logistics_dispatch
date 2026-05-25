import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { MailModule } from './mail/mail.module';
import { OrdersModule } from './orders/orders.module';
import { DriversModule } from './drivers/drivers.module';
import { DispatchModule } from './dispatch/dispatch.module';
import { BullMqInfrastructureModule } from './bullmq/bullmq.module';
import { ThrottlerInfrastructureModule } from './common/throttler/throttler-infrastructure.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        url: config.get<string>('DATABASE_URL'),
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        migrations: [__dirname + '/database/migrations/*{.ts,.js}'],
        synchronize: false,
        migrationsRun: false,
      }),
    }),
    BullMqInfrastructureModule,
    ThrottlerInfrastructureModule,
    MailModule,
    AuthModule,
    UsersModule,
    OrdersModule,
    DriversModule,
    DispatchModule,
  ],

  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
