import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { MailModule } from './mail/mail.module';
import { ThrottlerGuard, ThrottlerModule, minutes } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { RedisInfrastructureModule } from './redis/redis.module';
import { RedisService } from './redis/redis.service';
import { RedisThrottlerStorage } from './common/throttler/redis-throttler-storage';
import {
  generateThrottleKey,
  getClientTracker,
} from './common/throttler/throttle-key.util';
import { throttleConfig } from './common/throttler/throttle.config';
import { OrdersModule } from './orders/orders.module';

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
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule, RedisInfrastructureModule],
      inject: [ConfigService, RedisService],
      useFactory: (config: ConfigService, redisService: RedisService) => {
        const globalTtlMs =
          Number(config.get<string>('THROTTLE_GLOBAL_TTL_MS')) ||
          throttleConfig.global.ttlMs ||
          minutes(1);
        const globalLimit =
          Number(config.get<string>('THROTTLE_GLOBAL_LIMIT')) ||
          throttleConfig.global.limit;
        const globalBlockMs =
          Number(config.get<string>('THROTTLE_GLOBAL_BLOCK_MS')) ||
          throttleConfig.global.blockMs ||
          minutes(2);

        return {
          throttlers: [
            {
              name: 'default',
              ttl: globalTtlMs,
              limit: globalLimit,
              blockDuration: globalBlockMs,
            },
          ],
          storage: new RedisThrottlerStorage(redisService),
          getTracker: getClientTracker,
          generateKey: generateThrottleKey,
          errorMessage: 'Too many requests. Please try again later.',
        };
      },
    }),
    MailModule,
    AuthModule,
    UsersModule,
    OrdersModule,
  ],

  controllers: [AppController],
  providers: [AppService, { provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
