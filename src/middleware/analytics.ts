import type { Context, Next } from 'hono';
import { recordAnalyticsEvent } from '../utils/analytics.ts';
import type { Bindings } from '../types/env.ts';

export async function analyticsMiddleware(c: Context<{ Bindings: Bindings }>, next: Next) {
  const startTime = Date.now();
  const path = c.req.path;
  const method = c.req.method;

  await next();

  const durationMs = Date.now() - startTime;
  const statusCode = c.res.status;
  const user = c.get('user');
  const traceId = (c.get('traceId') as string) || c.req.header('cf-ray') || null;
  const country = c.req.header('cf-ipcountry') || null;

  // Record point into Cloudflare Analytics Engine
  if (c.env?.ANALYTICS) {
    const record = {
      eventType: statusCode >= 400 ? 'HTTP_ERROR' : 'HTTP_SUCCESS',
      path,
      method,
      statusCode,
      durationMs,
      country,
      actorId: user?.sub || null,
      traceId,
      authLevel: user?.level || 0,
    };

    if (c.executionCtx?.waitUntil) {
      c.executionCtx.waitUntil(Promise.resolve(recordAnalyticsEvent(c.env.ANALYTICS, record)));
    } else {
      recordAnalyticsEvent(c.env.ANALYTICS, record);
    }
  }
}
