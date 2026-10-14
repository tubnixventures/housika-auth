import type { Context, Next } from 'hono';
import { createId } from '../utils/ids.ts';

export async function securityHeadersMiddleware(c: Context, next: Next) {
  const traceId = c.req.header('cf-ray') || c.req.header('x-request-id') || createId('trc', 16);
  c.set('traceId', traceId);

  await next();

  // Hyperscale Enterprise Security Headers
  c.header('X-Housika-Trace-Id', traceId);
  c.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  c.header('X-Content-Type-Options', 'nosniff');
  c.header('X-Frame-Options', 'DENY');
  c.header('Referrer-Policy', 'strict-origin-when-cross-origin');
  c.header('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
}
