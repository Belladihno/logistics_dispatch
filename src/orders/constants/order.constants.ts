export const IDEMPOTENCY_KEY_TTL_SECONDS = 86400; // 24 hours
export const IDEMPOTENCY_REDIS_PREFIX = (key: string) =>
  `idempotency:order:${key}`;
