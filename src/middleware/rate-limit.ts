import type { Context, Next } from 'hono';
import { checkRateLimit } from '../utils/kv-ratelimit.ts';
import { sendError } from '../utils/response.ts';
import type { Bindings } from '../types/env.ts';

export function rateLimit(maxRequests = 20, windowSeconds = 60, prefix = 'route') {
  return async (c: Context<{ Bindings: Bindings }>, next: Next) => {
    const ip = c.req.header('cf-connecting-ip') || c.req.header('x-forwarded-for') || '127.0.0.1';
    const path = c.req.path;
    const identifier = `${prefix}:${ip}:${path}`;
    const kv = c.env?.KV_RATE_LIMIT;

    const result = await checkRateLimit(kv, identifier, maxRequests, windowSeconds);

    c.header('X-RateLimit-Limit', maxRequests.toString());
    c.header('X-RateLimit-Remaining', result.remaining.toString());
    c.header('X-RateLimit-Reset', result.resetAt.toString());

    if (!result.allowed) {
      const retryAfter = Math.max(1, result.resetAt - Math.floor(Date.now() / 1000));
      c.header('Retry-After', retryAfter.toString());
      return sendError(
        c,
        'Too many requests. Please wait before retrying.',
        429,
        'RATE_LIMIT_EXCEEDED',
        { retryAfterSeconds: retryAfter }
      );
    }

    await next();
  };
}

export function globalRateLimit(maxRequests = 120, windowSeconds = 60) {
  return async (c: Context<{ Bindings: Bindings }>, next: Next) => {
    const ip = c.req.header('cf-connecting-ip') || c.req.header('x-forwarded-for') || '127.0.0.1';
    const identifier = `global:${ip}`;
    const kv = c.env?.KV_RATE_LIMIT;

    const result = await checkRateLimit(kv, identifier, maxRequests, windowSeconds);

    c.header('X-RateLimit-Limit', maxRequests.toString());
    c.header('X-RateLimit-Remaining', result.remaining.toString());

    if (!result.allowed) {
      const retryAfter = Math.max(1, result.resetAt - Math.floor(Date.now() / 1000));
      c.header('Retry-After', retryAfter.toString());
      return sendError(
        c,
        'Global request quota exceeded. Please reduce request frequency.',
        429,
        'RATE_LIMIT_EXCEEDED',
        { retryAfterSeconds: retryAfter }
      );
    }

    await next();
  };
}
