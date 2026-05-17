import { ThrottlerStorage } from '@nestjs/throttler';
import type { ThrottlerStorageRecord } from '@nestjs/throttler/dist/throttler-storage-record.interface';
import { RedisService } from '../../redis/redis.service';

export class RedisThrottlerStorage implements ThrottlerStorage {
  constructor(private readonly redisService: RedisService) {}
  private readonly scriptShaByName = new Map<string, string>();

  async increment(
    key: string,
    ttl: number,
    limit: number,
    blockDuration: number,
    throttlerName: string,
  ): Promise<ThrottlerStorageRecord> {
    const countKey = `throttle:${key}:${throttlerName}:count`;
    const blockKey = `throttle:${key}:${throttlerName}:block`;

    const result = await this.evalIncrementScript(
      countKey,
      blockKey,
      ttl,
      limit,
      blockDuration,
      throttlerName,
    );

    const [
      totalHits,
      timeToExpireSeconds,
      isBlocked,
      timeToBlockExpireSeconds,
    ] = result;

    return {
      totalHits,
      timeToExpire: timeToExpireSeconds,
      isBlocked: isBlocked === 1,
      timeToBlockExpire: timeToBlockExpireSeconds,
    };
  }

  private async evalIncrementScript(
    countKey: string,
    blockKey: string,
    ttlMs: number,
    limit: number,
    blockDurationMs: number,
    throttlerName: string,
  ): Promise<number[]> {
    const redis = this.redisService.getClient();
    const script = `
local countKey = KEYS[1]
local blockKey = KEYS[2]
local ttlMs = tonumber(ARGV[1])
local limit = tonumber(ARGV[2])
local blockDurationMs = tonumber(ARGV[3])

local blockPttl = redis.call('PTTL', blockKey)
if blockPttl > 0 then
  local count = tonumber(redis.call('GET', countKey) or (limit + 1))
  return { count, math.ceil(blockPttl / 1000), 1, math.ceil(blockPttl / 1000) }
end

local count = redis.call('INCR', countKey)
if count == 1 then
  redis.call('PEXPIRE', countKey, ttlMs)
end

local countPttl = redis.call('PTTL', countKey)
if countPttl < 0 then
  redis.call('PEXPIRE', countKey, ttlMs)
  countPttl = ttlMs
end

if count > limit then
  redis.call('SET', blockKey, '1', 'PX', blockDurationMs)
  return { count, math.ceil(countPttl / 1000), 1, math.ceil(blockDurationMs / 1000) }
end

return { count, math.ceil(countPttl / 1000), 0, 0 }
`;

    const knownSha = this.scriptShaByName.get(throttlerName);

    if (knownSha) {
      try {
        return (await redis.evalsha(
          knownSha,
          2,
          countKey,
          blockKey,
          ttlMs,
          limit,
          blockDurationMs,
        )) as number[];
      } catch {
        // Fallback to EVAL path below when script is missing after Redis restart.
      }
    }

    const loadedSha = (await redis.script('LOAD', script)) as string;
    this.scriptShaByName.set(throttlerName, loadedSha);

    return (await redis.evalsha(
      loadedSha,
      2,
      countKey,
      blockKey,
      ttlMs,
      limit,
      blockDurationMs,
    )) as number[];
  }
}
