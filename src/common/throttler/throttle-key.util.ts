import { ExecutionContext } from '@nestjs/common';
import { createHash } from 'crypto';

interface RequestLike {
  method?: string;
  baseUrl?: string;
  path?: string;
  url?: string;
  route?: {
    path?: string;
  };
  body?: Record<string, unknown>;
  headers?: Record<string, unknown>;
  ips?: string[];
  ip?: string;
  socket?: {
    remoteAddress?: string;
  };
}

const EMAIL_SENSITIVE_AUTH_ROUTES = new Set([
  'POST /auth/register',
  'POST /auth/login',
  'POST /auth/resend-verification-email',
  'POST /auth/forgot-password',
]);

export const getClientTracker = (req: Record<string, any>): string => {
  const request = req as RequestLike;
  const forwardedFor = request.headers?.['x-forwarded-for'];

  if (typeof forwardedFor === 'string' && forwardedFor.length > 0) {
    return forwardedFor.split(',')[0].trim();
  }

  if (Array.isArray(request.ips) && request.ips.length > 0) {
    return request.ips[0];
  }

  if (typeof request.ip === 'string' && request.ip.length > 0) {
    return request.ip;
  }

  if (request.socket?.remoteAddress) {
    return request.socket.remoteAddress;
  }

  return 'unknown-client';
};

export const generateThrottleKey = (
  context: ExecutionContext,
  tracker: string,
  throttlerName: string,
): string => {
  const request = context.switchToHttp().getRequest<RequestLike>();
  const method = (request.method || 'UNKNOWN').toUpperCase();
  const routePath = getStableRoutePath(request);
  const routeKey = `${method} ${routePath}`;

  const keyParts = [
    throttlerName,
    method,
    routePath,
    `ip:${tracker}`,
    getEmailIdentityPart(routeKey, request.body),
  ].filter(Boolean);

  return hashValue(keyParts.join('|'));
};

const getStableRoutePath = (request: RequestLike): string => {
  const routePath = request.route?.path || request.path || request.url || '/';
  const withoutQuery = routePath.split('?')[0];
  const baseUrl = request.baseUrl || '';

  return `${baseUrl}${withoutQuery}` || '/';
};

const getEmailIdentityPart = (
  routeKey: string,
  body: Record<string, unknown> | undefined,
): string | undefined => {
  if (!EMAIL_SENSITIVE_AUTH_ROUTES.has(routeKey)) {
    return undefined;
  }

  const email =
    typeof body?.email === 'string' ? body.email.toLowerCase().trim() : '';

  if (!email) {
    return undefined;
  }

  return `email:${hashValue(email).slice(0, 16)}`;
};

const hashValue = (value: string): string =>
  createHash('sha256').update(value).digest('hex');
