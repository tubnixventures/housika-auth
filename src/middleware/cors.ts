import type { Context, Next } from 'hono';
import { cors } from 'hono/cors';
import type { Bindings } from '../types/env.ts';

const DEFAULT_ORIGINS = ['https://housika.co.ke', 'https://auth.housika.co.ke', 'https://app.housika.co.ke'];

export function isOriginAllowed(origin: string | undefined, env?: Bindings): boolean {
  if (!origin) return true; // Non-browser clients (curl, mobile native apps)
  const isDev = env?.ENVIRONMENT !== 'production';
  if (isDev && (origin.includes('localhost') || origin.includes('127.0.0.1') || origin.endsWith('.run.app'))) {
    return true;
  }
  const configured = env?.ALLOWED_ORIGINS
    ? env.ALLOWED_ORIGINS.split(',').map((s) => s.trim())
    : DEFAULT_ORIGINS;
  if (configured.includes(origin)) return true;

  try {
    const url = new URL(origin);
    return url.hostname === 'housika.co.ke' || url.hostname.endsWith('.housika.co.ke');
  } catch {
    return false;
  }
}

export function secureCorsMiddleware() {
  return async (c: Context<{ Bindings: Bindings }>, next: Next) => {
    const origin = c.req.header('Origin');
    const allowed = isOriginAllowed(origin, c.env);

    const handler = cors({
      origin: allowed ? (origin || '*') : 'null',
      allowMethods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
      allowHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
      exposeHeaders: ['Content-Length', 'X-Housika-Trace-Id', 'X-RateLimit-Limit', 'X-RateLimit-Remaining'],
      credentials: true,
      maxAge: 86400,
    });

    return handler(c, next);
  };
}
