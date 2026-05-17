const parsePositiveInt = (
  value: string | undefined,
  fallback: number,
): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
};

export const throttleConfig = {
  global: {
    ttlMs: parsePositiveInt(process.env.THROTTLE_GLOBAL_TTL_MS, 60_000),
    limit: parsePositiveInt(process.env.THROTTLE_GLOBAL_LIMIT, 120),
    blockMs: parsePositiveInt(process.env.THROTTLE_GLOBAL_BLOCK_MS, 120_000),
  },
  auth: {
    register: {
      limit: parsePositiveInt(process.env.THROTTLE_AUTH_REGISTER_LIMIT, 3),
      ttlMs: parsePositiveInt(
        process.env.THROTTLE_AUTH_REGISTER_TTL_MS,
        900_000,
      ),
      blockMs: parsePositiveInt(
        process.env.THROTTLE_AUTH_REGISTER_BLOCK_MS,
        900_000,
      ),
    },
    login: {
      limit: parsePositiveInt(process.env.THROTTLE_AUTH_LOGIN_LIMIT, 5),
      ttlMs: parsePositiveInt(process.env.THROTTLE_AUTH_LOGIN_TTL_MS, 60_000),
      blockMs: parsePositiveInt(
        process.env.THROTTLE_AUTH_LOGIN_BLOCK_MS,
        900_000,
      ),
    },
    resendVerificationEmail: {
      limit: parsePositiveInt(process.env.THROTTLE_AUTH_RESEND_LIMIT, 2),
      ttlMs: parsePositiveInt(process.env.THROTTLE_AUTH_RESEND_TTL_MS, 600_000),
      blockMs: parsePositiveInt(
        process.env.THROTTLE_AUTH_RESEND_BLOCK_MS,
        600_000,
      ),
    },
    forgotPassword: {
      limit: parsePositiveInt(
        process.env.THROTTLE_AUTH_FORGOT_PASSWORD_LIMIT,
        2,
      ),
      ttlMs: parsePositiveInt(
        process.env.THROTTLE_AUTH_FORGOT_PASSWORD_TTL_MS,
        600_000,
      ),
      blockMs: parsePositiveInt(
        process.env.THROTTLE_AUTH_FORGOT_PASSWORD_BLOCK_MS,
        600_000,
      ),
    },
    refresh: {
      limit: parsePositiveInt(process.env.THROTTLE_AUTH_REFRESH_LIMIT, 10),
      ttlMs: parsePositiveInt(
        process.env.THROTTLE_AUTH_REFRESH_TTL_MS,
        300_000,
      ),
      blockMs: parsePositiveInt(
        process.env.THROTTLE_AUTH_REFRESH_BLOCK_MS,
        600_000,
      ),
    },
  },
};
