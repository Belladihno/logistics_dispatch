import { Injectable } from '@nestjs/common';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';

@Injectable()
export class RedisService {
  constructor(@InjectRedis() private readonly redis: Redis) {}

  async get(key: string): Promise<string | null> {
    return this.redis.get(key);
  }

  async setWithExpiry(
    key: string,
    value: string,
    ttlInSeconds: number,
  ): Promise<void> {
    await this.redis.set(key, value, 'EX', ttlInSeconds);
  }

  async del(key: string): Promise<number> {
    return this.redis.del(key);
  }

  async delete(key: string): Promise<number> {
    return this.redis.del(key);
  }

  getClient(): Redis {
    return this.redis;
  }
}
