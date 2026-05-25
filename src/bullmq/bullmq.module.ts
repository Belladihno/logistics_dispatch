import type { ConnectionOptions } from 'tls';
import { Global, Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';

interface RedisConnectionOptions {
  host: string;
  port: number;
  username?: string;
  password?: string;
  db?: number;
  tls?: ConnectionOptions;
}

const parseRedisConnection = (redisUrl: string): RedisConnectionOptions => {
  try {
    const parsed = new URL(redisUrl);
    const isTls = parsed.protocol === 'rediss:';

    const dbRaw = parsed.pathname.replace('/', '').trim();
    const dbParsed = dbRaw.length > 0 ? parseInt(dbRaw, 10) : undefined;
    const db =
      dbParsed !== undefined && Number.isFinite(dbParsed)
        ? dbParsed
        : undefined;

    return {
      host: parsed.hostname || 'localhost',
      port: parsed.port ? Number(parsed.port) : isTls ? 6380 : 6379,
      username: parsed.username.length > 0 ? parsed.username : undefined,
      password: parsed.password.length > 0 ? parsed.password : undefined,
      db,
      tls: isTls ? {} : undefined,
    };
  } catch {
    return {
      host: 'localhost',
      port: 6379,
    };
  }
};

@Global()
@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const redisUrl =
          config.get<string>('REDIS_URL') ?? 'redis://localhost:6379';

        return {
          connection: parseRedisConnection(redisUrl),
        };
      },
    }),
  ],
  exports: [BullModule],
})
export class BullMqInfrastructureModule {}
