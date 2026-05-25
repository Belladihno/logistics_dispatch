import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { minutes, ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { RedisInfrastructureModule } from 'src/redis/redis.module';
import { RedisService } from 'src/redis/redis.service';
import { RedisThrottlerStorage } from './redis-throttler-storage';
import { generateThrottleKey, getClientTracker } from './throttle-key.util';
import { throttleConfig } from './throttle.config';

@Module({
  imports: [
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
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
  exports: [ThrottlerModule],
})
export class ThrottlerInfrastructureModule {}
